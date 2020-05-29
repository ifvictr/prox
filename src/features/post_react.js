import config from '../config'
import Post from '../models/post'
import { hash } from '../utils'
import { getMessage, sendEphemeralMessage } from '../utils/slack'

export default app => {
    app.event('reaction_added', async ({ client, context, event }) => {
        // Reaction needs to be sent in post channel
        if (event.item.channel !== config.postChannelId) {
            return
        }

        // Reaction needs to be sent to anon reply
        const message = await getMessage(client, event.item.channel, event.item.ts)
        if (!message.thread_ts) {
            return
        }
        if (message.bot_id === context.botId && !message.username) {
            return
        }

        // Reaction needs to be from OP, sent to a message threaded under their Prox post
        const post = await Post.findOne({ postMessageId: message.thread_ts })
        const senderIdHash = hash(event.user, post.salt)
        if (!post || post.authorIdHash !== senderIdHash) {
            return
        }

        try {
            const displayName = message.user ? `<@${message.user}>` : message.username
            await Promise.all([
                client.reactions.add({
                    channel: event.item.channel,
                    name: event.reaction,
                    timestamp: event.item.ts
                }),
                sendEphemeralMessage(client, event.item.channel, event.user, `Your :${event.reaction}: to ${displayName}’s message has been sent!`)
            ])
        } catch (e) {
            await sendEphemeralMessage(client, event.item.channel, event.user, `Failed to react. Reason: \`${e.data.error}\``)
        }
    })
}
