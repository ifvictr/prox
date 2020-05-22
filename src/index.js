import { SlackAdapter, SlackEventMiddleware, SlackMessageTypeMiddleware } from 'botbuilder-adapter-slack'
import { Botkit } from 'botkit'
import mongoose from 'mongoose'
import { SubmissionLayout } from './blocks'
import deleteCommand from './commands/delete'
import lockdownCommand from './commands/lockdown'
import Counter from './counter'
import Post from './models/post'
import { createSubmission, getIcon, getPreview, hash, removeSpecialTags, sendMessage, toPrettyPseudonym } from './utils'

// Set up MongoDB
mongoose.connect(process.env.MONGODB_URI, { useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true })

// Set up Slack adapter
const adapter = new SlackAdapter({
    clientSigningSecret: process.env.SLACK_CLIENT_SIGNING_SECRET,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    scopes: ['bot', 'chat:write:bot'],
    botToken: process.env.SLACK_CLIENT_BOT_TOKEN
})
adapter.use(new SlackEventMiddleware())
adapter.use(new SlackMessageTypeMiddleware())

const controller = new Botkit({ adapter })
const count = new Counter()

controller.ready(async () => {
    await count.init()
})

// Match anonymous replies sent via DMs
// Matches "1337: hello" and "#1337: hello"
const replyPattern = /^(#*)\d+:(\s|$)/
controller.hears(replyPattern, 'direct_message', async (bot, message) => {
    const args = message.text.split(/\s/)
    const postNumber = args[0].slice(0, -1).match(/\d+/g) // Remove the colon, then try to match a number
    const body = removeSpecialTags(args.slice(1).join(' '))

    // Validate that there's content to send
    if (!body) {
        await bot.say(':confused: You need to enter a reply to send.')
        return
    }

    // Validate that the post exists
    const post = await Post.findOne({ postNumber }).exec()
    if (!post) {
        await bot.say(`:confused: Couldn’t seem to find post *#${postNumber}*.`)
        return
    }

    // Stop if the post is deleted
    if (post.deletedAt) {
        await bot.say(`:skull: This post has been deleted. Your reply will not be sent.`)
        return
    }

    // Stop if the post is locked down
    if (post.lockedDownAt) {
        await bot.say(`:lock: This post is currently on lockdown. Your reply will not be sent.`)
        return
    }

    const res = await bot.api.chat.getPermalink({
        channel: process.env.SLACK_POST_CHANNEL_ID,
        message_ts: post.postMessageId
    })
    await bot.say(`:ok_hand: Your reply to <${res.permalink}|post *#${postNumber}*> has been sent. To stay notified about new replies, just click *More actions* → *Follow thread* on the post.`)

    // Send reply
    const senderIdHash = hash(message.user, post.salt)
    const displayName = toPrettyPseudonym(senderIdHash) + (senderIdHash === post.authorIdHash ? ' (OP)' : '')
    const icon = getIcon(senderIdHash)
    await bot.api.chat.postMessage({
        channel: process.env.SLACK_POST_CHANNEL_ID,
        text: body,
        thread_ts: post.postMessageId,
        username: displayName,
        icon_emoji: icon ? `:${icon}:` : null,
    })

    await sendMessage(bot, process.env.SLACK_STREAM_CHANNEL_ID, `_${displayName} (\`${senderIdHash.substring(0, 8)}\`) sent a reply to *#${postNumber}*:_\n>>> ${body}`)
})

// Match non-command DMs
const messagePattern = /^(?!\/).*/
controller.hears(messagePattern, 'direct_message', async (bot, message) => {
    await bot.say(':mag: Your submission is now under review. If you were trying to send an anonymous reply, resend it in the following format: `<post number>: <your message here>` (i.e., sending `1337: hello` would send “hello” to post *#1337*).')
    await createSubmission(bot, process.env.SLACK_REVIEW_CHANNEL_ID, message)
})

controller.on('block_actions', async (bot, message) => {
    const id = message.text
    const submission = await Post.findById(id).exec()
    // Handle edge case where ticket isn't in database
    if (!submission) {
        await bot.startConversationInThread(message.channel, message.user, message.message.ts)
        await bot.say(':rotating_light: Something went wrong. Reason: `submission not found`')
        return
    }

    const action = message.actions[0].action_id
    switch (action) {
        case 'post_approve':
            const newCount = await count.increment()
            const mainContent = `*#${newCount}:* ${removeSpecialTags(submission.body)}`
            let postMessage = await sendMessage(bot, process.env.SLACK_POST_CHANNEL_ID,
                submission.markedSensitiveAt
                    ? `:warning: *#${newCount}:* _This post contains potentially sensitive content. Click on “View thread” to view it._`
                    : mainContent)

            // If the post is marked sensitive, post in the thread and save that message ID instead.
            // We can always retrieve the parent message's ID if we need it in the future.
            if (submission.markedSensitiveAt) {
                await bot.startConversationInThread(process.env.SLACK_POST_CHANNEL_ID, message.user, postMessage.id)
                postMessage = await bot.say(mainContent)
            }

            submission.postMessageId = postMessage.id
            submission.postNumber = newCount
            submission.approvedAt = Date.now()

            await submission.save()
            break
        case 'post_reject':
            await submission.delete()
            break
        case 'post_toggle_sensitive':
            submission.markedSensitiveAt = submission.markedSensitiveAt ? null : Date.now()
            await submission.save()
            break
    }

    // Update the ticket's status message
    const status = ({
        post_approve: 'approved',
        post_reject: 'rejected'
    })[action] || 'waiting'
    const props = {
        id,
        isSensitive: Boolean(submission.markedSensitiveAt),
        postChannel: process.env.SLACK_POST_CHANNEL_ID,
        postNumber: submission.postNumber,
        status,
        text: submission.body,
        user: message.user
    }
    await bot.replyInteractive(message, { blocks: SubmissionLayout(props) })

    // Only log submission approval/rejection
    if (status !== 'waiting') {
        await sendMessage(bot, process.env.SLACK_STREAM_CHANNEL_ID, `_<@${message.user}> ${status} a submission:_\n>>> ${getPreview(50, removeSpecialTags(submission.body))}`)
    }
})

const commands = new Map([
    ['delete', deleteCommand],
    ['lockdown', lockdownCommand]
])
controller.on('slash_command', async (bot, message) => {
    const args = message.text.split(' ')
    const subcommand = args[0].toLowerCase()
    if (!commands.has(subcommand)) {
        await bot.replyEphemeral(message, 'Command not found.')
        return
    }

    // Pass control to appropriate handler
    const commandHandler = commands.get(subcommand)
    await commandHandler(bot, message, args)
})

controller.on('member_joined_channel', async (bot, message) => {
    if (message.channel === process.env.SLACK_POST_CHANNEL_ID) {
        await sendMessage(bot, process.env.SLACK_STREAM_CHANNEL_ID, `_Someone joined <#${process.env.SLACK_POST_CHANNEL_ID}>._`)
    }
})

controller.on('member_left_channel', async (bot, message) => {
    if (message.channel === process.env.SLACK_POST_CHANNEL_ID) {
        await sendMessage(bot, process.env.SLACK_STREAM_CHANNEL_ID, `_Someone left <#${process.env.SLACK_POST_CHANNEL_ID}>._`)
    }
})
