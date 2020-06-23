import { AddReactionsPrompt } from '../blocks'
import config from '../config'
import Post from '../models/post'
import { hash } from '../utils'
import { getMessage, sendEphemeralMessage, sendMessage } from '../utils/slack'

export default app => {
    app.shortcut('reactions_add', async ({ ack, body, client, context, shortcut }) => {
        await ack()

        // Can only be used in post channel
        if (shortcut.channel.id !== config.postChannelId) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: `You can only add anonymous reactions to messages in <#${config.postChannelId}>.`,
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        // Can only be used in threaded replies
        if (!shortcut.message.thread_ts || shortcut.message.ts === shortcut.message.thread_ts) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: 'You can only use this on threaded messages.',
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        // Can only be used on a reply under a Prox post
        // Attempt to get the very first reply in the thread
        const { messages } = await client.conversations.replies({
            channel: shortcut.channel.id,
            ts: shortcut.message.thread_ts,
            oldest: shortcut.message.thread_ts,
            limit: 1
        })
        const sensitiveMessage = messages
            .filter(message => message.bot_id === context.botId) // Must be from Prox
            .filter(message => !message.username) // Must not be an anon reply
            .filter(message => message.ts !== shortcut.message.thread_ts)[0] // Must not be the top-level post itself
        const post = await Post.findOne({
            $or: [
                { postMessageId: shortcut.message.thread_ts }, // For normal posts
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

        // Can only be used by the post's author
        const senderIdHash = hash(shortcut.user.id, post.salt)
        if (senderIdHash !== post.authorIdHash) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: 'Only the author of this post can add anonymous reactions.',
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        // Can only be used when the post isn't locked
        if (post.lockedDownAt) {
            await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
                text: 'Sorry, anonymous reactions can’t be sent while the post is locked.',
                thread_ts: shortcut.message.thread_ts
            })
            return
        }

        const targetMessage = await getMessage(client, shortcut.channel.id, shortcut.message.ts)

        const { permalink: postPermalink } = await client.chat.getPermalink({
            channel: config.postChannelId,
            message_ts: post.postMessageId
        })
        await sendMessage(client, shortcut.user.id, {
            blocks: AddReactionsPrompt({
                postNumber: post.postNumber,
                postPermalink,
                targetMessageId: targetMessage.ts,
                text: targetMessage.text,
                user: targetMessage.user,
                username: targetMessage.username
            })
        })

        await sendEphemeralMessage(client, shortcut.channel.id, shortcut.user.id, {
            text: `Check your DMs with <@${context.botUserId}> for further instructions.`,
            thread_ts: body.message.thread_ts
        })
    })

    app.action('reactions_send', async ({ ack, action, body, client }) => {
        await ack()

        // Get the message we sent to the user
        const promptMessage = await getMessage(client, body.channel.id, body.message.ts)
        if (!promptMessage.reactions) {
            await sendEphemeralMessage(client, body.channel.id, body.user.id, 'You haven’t added any reactions to the message yet.')
            return
        }

        // Attempt to add all the reactions to the message
        const reactionPromises = promptMessage.reactions
            .filter(reaction => reaction.users.includes(body.user.id))
            .map(reaction => client.reactions.add({
                channel: config.postChannelId,
                name: reaction.name,
                timestamp: action.value
            }))

        try {
            await Promise.all(reactionPromises)
            await sendMessage(client, body.channel.id, ':+1: Your reactions have been sent!')
        } catch (e) {
            await sendEphemeralMessage(client, body.channel.id, body.user.id, `Failed to send a reaction. Reason: \`${e.data.error}\``)
        } finally {
            await client.chat.delete({
                channel: body.channel.id,
                ts: body.message.ts
            })
        }
    })

    app.action('reactions_cancel', async ({ ack, body, client }) => {
        await ack()

        await client.chat.delete({
            channel: body.channel.id,
            ts: body.message.ts
        })
    })
}
