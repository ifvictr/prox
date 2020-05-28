import config from '../config'
import { channelType, threaded } from '../middlewares'
import Post from '../models/post'
import { getIcon, hash, removeSpecialTags, toPrettyPseudonym } from '../utils'
import { sendMessage } from '../utils/slack'

export default app => {
    // Match anonymous replies sent via DMs
    // Matches "1337: hello" and "#1337: hello"
    const replyPattern = /^(#*)\d+:(\s|$)/
    app.message(channelType('im'), threaded(false), replyPattern, async ({ client, event, say }) => {
        const args = event.text.split(/\s/)
        const postNumber = args[0].slice(0, -1).match(/\d+/g) // Remove the colon, then try to match a number
        const body = removeSpecialTags(args.slice(1).join(' '))

        // Validate that there's content to send
        if (!body) {
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

        const { permalink: postPermalink } = await client.chat.getPermalink({
            channel: config.postChannelId,
            message_ts: post.postMessageId
        })
        await say({
            text: `:ok_hand: Your reply to <${postPermalink}|*#${postNumber}*> has been sent. To stay notified about new replies, just click *More actions* → *Follow thread* on the post.`,
            unfurl_links: false
        })

        await sendMessage(client, config.streamChannelId, {
            text: `_${displayName} (\`${senderIdHash.substring(0, 8)}\`) sent a reply to <${postPermalink}|*#${postNumber}*>:_\n>>> ${body}`,
            unfurl_links: false
        })
    })
}
