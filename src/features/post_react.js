import config from '../config'
import Post from '../models/post'
import { hash } from '../utils'
import { getMessage, sendEphemeralMessage } from '../utils/slack'

export default app => {
    app.event('reaction_added', async ({ client, context, event }) => {
        // Needs to be in the post channel
        if (event.item.channel !== config.postChannelId) {
            return
        }

        // Needs to be sent to an anon reply
        const message = await getMessage(client, event.item.channel, event.item.ts)
        if (!message.thread_ts || (message.bot_id === context.botId && !message.username)) {
            return
        }

        // Needs to be from the post author to a reply under their post
        const post = await Post.findOne({ postMessageId: message.thread_ts })
        const senderIdHash = hash(event.user, post.salt)
        if (!post || post.authorIdHash !== senderIdHash) {
            return
        }

        try {
            const displayName = message.user ? `<@${message.user}>` : `*${message.username}*`
            await Promise.all([
                client.reactions.add({
                    channel: event.item.channel,
                    name: event.reaction,
                    timestamp: event.item.ts
                }),
                sendEphemeralMessage(client, event.item.channel, event.user, {
                    text: `Your reaction :${event.reaction}: to ${displayName} has been mirrored! Remove your original reaction if you haven’t already.`,
                    thread_ts: message.thread_ts
                })
            ])
        } catch (e) {
            await sendEphemeralMessage(client, event.item.channel, event.user, {
                text: `Failed to react. Reason: \`${e.data.error}\``,
                thread_ts: message.thread_ts
            })
        }
    })
}
