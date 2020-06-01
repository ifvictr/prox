import { subtype } from '@slack/bolt'
import config from '../config'
import { channel } from '../middlewares'
import Post from '../models/post'
import { removeSpecialTags } from '../utils'
import { sendMessage } from '../utils/slack'

export default app => {
    app.event('member_joined_channel', channel(config.postChannelId), async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone joined <#${event.channel}>._`)
    })

    app.event('member_left_channel', channel(config.postChannelId), async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone left <#${event.channel}>._`)
    })

    app.message(subtype('message_deleted'), channel(config.postChannelId), async ({ client, context, message }) => {
        // Only log deletions of Prox's messages
        const deletedMessage = message.previous_message
        if (!(deletedMessage.user === context.botUserId || deletedMessage.bot_id === context.botId)) {
            return
        }

        // Check if the message was a post or a reply to one
        const post = await Post.findOne({
            $or: [
                { postMessageId: deletedMessage.ts },
                // Include only if it's a threaded message
                ...deletedMessage.thread_ts
                    ? [{ postMessageId: deletedMessage.thread_ts }]
                    : []
            ]
        })

        // We don't care about messages that we sent that aren't tied to a post
        if (!post) {
            return
        }

        let messageType
        if (deletedMessage.ts === post.postMessageId) { // Was a post
            messageType = 'post'
        } else if (deletedMessage.thread_ts === post.postMessageId && deletedMessage.username) { // Was a reply
            messageType = 'reply'
        } else { // We don't care about notification messages
            return
        }

        const displayName = deletedMessage.user ? `<@${deletedMessage.user}>` : deletedMessage.username
        // Attempt to get permalink of the post
        let postPermalink
        try {
            const { permalink } = await client.chat.getPermalink({
                channel: config.postChannelId,
                message_ts: post.postMessageId
            })
            postPermalink = permalink
        } catch (e) {
            // We'll just not include a permalink
        }
        let postNumberText = `*#${post.postNumber}*`
        if (postPermalink) {
            postNumberText = `<${postPermalink}|${postNumberText}>`
        }

        await sendMessage(client, config.streamChannelId, {
            text: `_${messageType !== 'post' ? `A ${messageType} from ${displayName} under ` : ''}${postNumberText} was deleted:_\n>>> ${removeSpecialTags(deletedMessage.text)}`,
            unfurl_links: false
        })
    })
}
