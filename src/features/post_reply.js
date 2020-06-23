import { ReplyModal } from '../blocks'
import config from '../config'
import { channelType, threaded } from '../middlewares'
import Post from '../models/post'
import Pseudonym from '../models/pseudonym'
import { generatePseudonymSet, getIcon, hash, removeSpecialTags } from '../utils'
import { sendEphemeralMessage, sendMessage } from '../utils/slack'

const findOrCreatePseudonym = async (post, user) => {
    const userIdHash = hash(user, post.salt)

    let pseudonym = await Pseudonym.findOne({
        postId: post.id,
        userIdHash
    })

    // Create pseudonym if it doesn't exist
    if (!pseudonym) {
        const { adjective, noun } = await generateUniquePseudonymSet(post)
        pseudonym = new Pseudonym({
            postId: post.id,
            userIdHash,
            adjective,
            noun
        })
        await pseudonym.save()
    }

    return pseudonym
}

const generateUniquePseudonymSet = async post => {
    const pseudonymSet = generatePseudonymSet()

    // Check its existence and regenerate if someone else has that name already
    const filter = {
        postId: post.id,
        adjective: pseudonymSet.adjective,
        noun: pseudonymSet.noun
    }
    if (await Pseudonym.exists(filter)) {
        return generateUniquePseudonymSet(post)
    }

    return pseudonymSet
}

const sendReplyToPost = async (client, say, user, post, message) => {
    const pseudonym = await findOrCreatePseudonym(post, user)
    const displayName = pseudonym.name + (pseudonym.userIdHash === post.authorIdHash ? ' (OP)' : '')
    await sendMessage(client, config.postChannelId, {
        text: message,
        thread_ts: post.postMessageId,
        icon_emoji: getIcon(pseudonym.noun),
        username: displayName
    })

    const { permalink: postPermalink } = await client.chat.getPermalink({
        channel: config.postChannelId,
        message_ts: post.postMessageId
    })
    await say({
        text: `:ok_hand: Your reply to <${postPermalink}|*#${post.postNumber}*> has been sent. To stay notified about new replies, just click *More actions* → *Follow thread* on the post.`,
        unfurl_links: false
    })

    await sendMessage(client, config.streamChannelId, {
        text: `_${displayName} sent a reply to <${postPermalink}|*#${post.postNumber}*>:_\n>>> ${message}`,
        unfurl_links: false
    })
}

export default app => {
    // Match anonymous replies sent via DMs
    // Matches "1337: hello" and "#1337: hello"
    const replyPattern = /^(#*)\d+:(\s|$)/
    app.message(channelType('im'), threaded(false), replyPattern, async ({ client, event, say }) => {
        const args = event.text.split(/\s/)
        const postNumber = args[0].slice(0, -1).match(/\d+/g) // Remove the colon, then try to match a number
        const replyBody = removeSpecialTags(args.slice(1).join(' '))

        // Validate that there's content to send
        if (!replyBody) {
            await say(':confused: You need to enter a reply to send.')
            return
        }

        // Validate that the post exists
        const post = await Post.findOne({ postNumber })
        if (!post) {
            await say(`:confused: Couldn’t seem to find post *#${postNumber}*.`)
            return
        }

        // Stop if the post is deleted
        if (post.deletedAt) {
            await say(`:skull: This post has been deleted. Your reply will not be sent.`)
            return
        }

        // Stop if the post is locked
        if (post.lockedDownAt) {
            await say(`:lock: This post is currently locked. Your reply will not be sent.`)
            return
        }

        await sendReplyToPost(client, say, event.user, post, replyBody)
    })

    app.shortcut('reply_send', async ({ ack, client, context, shortcut }) => {
        await ack()

        // Can only be used in post channel
        if (shortcut.channel.id !== config.postChannelId) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: `You can only send anonymous replies to messages in <#${config.postChannelId}>.`,
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        // Can only be used on a reply under a Prox post
        // Attempt to get the very first reply in the thread
        const parentMessageId = shortcut.message.thread_ts || shortcut.message.ts
        const { messages } = await client.conversations.replies({
            channel: shortcut.channel.id,
            ts: parentMessageId,
            oldest: shortcut.message.thread_ts,
            limit: 1
        })
        const sensitiveMessage = messages
            .filter(message => message.bot_id === context.botId) // Must be from Prox
            .filter(message => !message.username) // Must not be an anon reply
            .filter(message => message.ts !== shortcut.message.thread_ts)[0] // Must not be the top-level post itself
        const post = await Post.findOne({
            $or: [
                { postMessageId: parentMessageId }, // For normal posts
                // For posts that were marked as sensitive
                ...sensitiveMessage
                    ? [{ postMessageId: sensitiveMessage.ts }]
                    : []
            ]
        })
        if (!post) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: `You can only use this under posts made by <@${context.botUserId}>.`,
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        // Stop if the post is deleted
        if (post.deletedAt) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: 'Sorry, anonymous replies can’t be sent to deleted posts.',
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        // Stop if the post is locked
        if (post.lockedDownAt) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: 'Sorry, anonymous replies can’t be sent while the post is locked.',
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        const displayName = shortcut.message.username || ''
        const isAuthor = displayName.includes('(OP)')
        await client.views.open({
            trigger_id: shortcut.trigger_id,
            view: ReplyModal({
                postNumber: post.postNumber,
                shouldPrepopulate: shortcut.message.user !== context.botUserId,
                user: shortcut.message.user,
                username: isAuthor ? 'OP' : displayName
            })
        })
    })

    app.view('reply', async ({ ack, body, client, say, view }) => {
        await ack()

        const { postNumber } = JSON.parse(view.private_metadata)
        const replyBody = view.state.values.reply_input.input_reply.value

        // Validate that the post exists
        const post = await Post.findOne({ postNumber })
        if (!post) {
            await sendEphemeralMessage(client, config.postChannelId, body.user.id, `:confused: Couldn’t seem to find post *#${postNumber}*.`)
            return
        }

        // Stop if the post is deleted
        if (post.deletedAt) {
            await sendEphemeralMessage(client, config.postChannelId, body.user.id, ':skull: This post has been deleted. Your reply will not be sent.')
            return
        }

        // Stop if the post is locked
        if (post.lockedDownAt) {
            await sendEphemeralMessage(client, config.postChannelId, body.user.id, ':lock: This post is currently locked. Your reply will not be sent.')
            return
        }

        await sendReplyToPost(client, say, body.user.id, post, replyBody)
    })
}
