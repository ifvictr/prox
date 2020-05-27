import { App } from '@slack/bolt'
import mongoose from 'mongoose'
import { SubmissionLayout } from './blocks'
import deleteCommand from './commands/delete'
import lockdownCommand from './commands/lockdown'
import config from './config'
import Counter from './counter'
import { channel, channelType } from './middlewares'
import Post from './models/post'
import { createSubmission, getIcon, getPreview, hash, removeSpecialTags, sendEphemeralMessage, sendMessage, toPrettyPseudonym } from './utils'

// Set up MongoDB
mongoose.connect(config.databaseUrl, {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true
})

// Set up Slack adapter
const app = new App({
    signingSecret: config.signingSecret,
    token: config.botToken,
    endpoints: '/api/messages'
})
const count = new Counter()

    ; (async () => {
        await app.start(config.port)
        await count.init()

        console.log('⚡️ Bolt app is running!')
    })()

// Match non-command DMs
const messagePattern = /^(?!\/).*/
app.message(channelType('im'), messagePattern, async ({ client, event, say }) => {
    await say(':mag: Your submission is now under review. If you were trying to send an anonymous reply, resend it in the following format: `<post number>: <your message here>` (i.e., sending `1337: hello` would send “hello” to post *#1337*).')
    await createSubmission(client, config.reviewChannelId, event)
})

// Match anonymous replies sent via DMs
// Matches "1337: hello" and "#1337: hello"
const replyPattern = /^(#*)\d+:(\s|$)/
app.message(channelType('im'), replyPattern, async ({ client, event, say }) => {
    const args = event.text.split(/\s/)
    const postNumber = args[0].slice(0, -1).match(/\d+/g) // Remove the colon, then try to match a number
    const body = removeSpecialTags(args.slice(1).join(' '))

    // Validate that there's content to send
    if (!body) {
        await say(':confused: You need to enter a reply to send.')
        return
    }

    // Validate that the post exists
    const post = await Post.findOne({ postNumber }).exec()
    if (!post) {
        await say(`:confused: Couldn’t seem to find post *#${postNumber}*.`)
        return
    }

    // Stop if the post is deleted
    if (post.deletedAt) {
        await say(`:skull: This post has been deleted. Your reply will not be sent.`)
        return
    }

    // Stop if the post is locked down
    if (post.lockedDownAt) {
        await say(`:lock: This post is currently on lockdown. Your reply will not be sent.`)
        return
    }

    const { permalink } = await client.chat.getPermalink({
        channel: config.postChannelId,
        message_ts: post.postMessageId
    })
    await say({
        text: `:ok_hand: Your reply to <${permalink}|*#${postNumber}*> has been sent. To stay notified about new replies, just click *More actions* → *Follow thread* on the post.`,
        unfurl_media: false
    })

    // Send reply
    const senderIdHash = hash(event.user, post.salt)
    const displayName = toPrettyPseudonym(senderIdHash) + (senderIdHash === post.authorIdHash ? ' (OP)' : '')
    const icon = getIcon(senderIdHash)
    await sendMessage(client, config.postChannelId, {
        text: body,
        thread_ts: post.postMessageId,
        icon_emoji: icon ? `:${icon}:` : null,
        username: displayName
    })

    await sendMessage(client, config.streamChannelId, `_${displayName} (\`${senderIdHash.substring(0, 8)}\`) sent a reply to *#${postNumber}*:_\n>>> ${body}`)
})

app.action('post_approve', async ({ ack, action, body, client }) => {
    await ack()

    const id = action.value
    const submission = await Post.findById(id).exec()
    // Handle edge case where ticket isn't in database
    if (!submission) {
        await sendMessage(client, action.channel, {
            text: ':rotating_light: Something went wrong. Reason: `submission not found`',
            thread_ts: body.message_ts
        })
        return
    }

    const newCount = await count.increment()
    const mainContent = `*#${newCount}:* ${removeSpecialTags(submission.body)}`
    let postMessage = await sendMessage(client, config.postChannelId,
        submission.markedSensitiveAt
            ? `:warning: *#${newCount}:* _This post contains potentially sensitive content. Click on “View thread” to view it._`
            : mainContent)

    // If the post is marked sensitive, post in the thread and save that message ID instead.
    // We can always retrieve the parent message's ID if we need it in the future.
    if (submission.markedSensitiveAt) {
        postMessage = await sendMessage(client, config.postChannelId, {
            text: mainContent,
            thread_ts: postMessage.ts
        })
    }

    submission.postMessageId = postMessage.ts
    submission.postNumber = newCount
    submission.approvedAt = Date.now()

    await submission.save()

    const props = {
        id,
        isSensitive: Boolean(submission.markedSensitiveAt),
        postChannel: config.postChannelId,
        postNumber: submission.postNumber,
        status: 'approved',
        text: submission.body,
        user: body.user.id
    }
    await client.chat.update({
        channel: config.reviewChannelId,
        ts: submission.reviewMessageId,
        blocks: SubmissionLayout(props)
    })

    await sendMessage(client, config.streamChannelId, `_<@${body.user.id}> approved a submission:_\n>>> ${getPreview(50, removeSpecialTags(submission.body))}`)
})

app.action('post_reject', async ({ ack, action, body, client }) => {
    await ack()

    const id = action.value
    const submission = await Post.findById(id).exec()
    // Handle edge case where ticket isn't in database
    if (!submission) {
        await sendMessage(client, action.channel, {
            text: ':rotating_light: Something went wrong. Reason: `submission not found`',
            thread_ts: body.message_ts
        })
        return
    }

    await submission.delete()

    const props = {
        id,
        isSensitive: Boolean(submission.markedSensitiveAt),
        postChannel: config.postChannelId,
        postNumber: submission.postNumber,
        status: 'rejected',
        text: submission.body,
        user: body.user.id
    }
    await client.chat.update({
        channel: config.reviewChannelId,
        ts: submission.reviewMessageId,
        blocks: SubmissionLayout(props)
    })

    await sendMessage(client, config.streamChannelId, `_<@${body.user.id}> rejected a submission:_\n>>> ${getPreview(50, removeSpecialTags(submission.body))}`)
})

app.action('post_toggle_sensitive', async ({ ack, action, body, client }) => {
    await ack()

    const id = action.value
    const submission = await Post.findById(id).exec()
    // Handle edge case where ticket isn't in database
    if (!submission) {
        await sendMessage(client, action.channel, {
            text: ':rotating_light: Something went wrong. Reason: `submission not found`',
            thread_ts: body.message_ts
        })
        return
    }

    submission.markedSensitiveAt = submission.markedSensitiveAt ? null : Date.now()
    await submission.save()

    const props = {
        id,
        isSensitive: Boolean(submission.markedSensitiveAt),
        postChannel: config.postChannelId,
        postNumber: submission.postNumber,
        status: 'waiting',
        text: submission.body,
        user: body.user.id
    }
    await client.chat.update({
        channel: config.reviewChannelId,
        ts: submission.reviewMessageId,
        blocks: SubmissionLayout(props)
    })
})

const subcommands = new Map([
    ['delete', deleteCommand],
    ['lockdown', lockdownCommand]
])
app.command('/prox', async ({ ack, client, command }) => {
    await ack()

    const args = command.text.split(' ')
    const subcommand = args[0].toLowerCase()
    if (!subcommands.has(subcommand)) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'Subcommand not found.')
        return
    }

    // Pass control to appropriate handler
    const subcommandHandler = subcommands.get(subcommand)
    await subcommandHandler(client, command, args)
})

app.event(channel(config.postChannelId), 'member_joined_channel', async ({ client, event }) => {
    await sendMessage(client, config.streamChannelId, `_Someone joined <#${event.channel}>._`)
})

app.event(channel(config.postChannelId), 'member_left_channel', async ({ client, event }) => {
    await sendMessage(client, config.streamChannelId, `_Someone left <#${event.channel}>._`)
})
