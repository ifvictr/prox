import config from '../config'
import { channelType } from '../middlewares'
import Post from '../models/post'
import { getIcon, hash, removeSpecialTags, toPrettyPseudonym } from '../utils'
import { sendMessage } from '../utils/slack'

export default app => {
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
}
