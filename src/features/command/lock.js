import config from '../../config'
import Post from '../../models/post'
import { removeSpecialTags } from '../../utils'
import { getParentMessageId, isUserInChannel, sendEphemeralMessage, sendMessage } from '../../utils/slack'

// /prox lock <post number>
export default async ({ client, command }, args) => {
    // Check if the user is part of the review channel
    if (!(await isUserInChannel(client, command.user_id, config.reviewChannelId))) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'You need to be a reviewer to use this command.')
        return
    }

    if (!args[1]) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'Please specify a post number.')
        return
    }

    if (isNaN(args[1])) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'The input must be a post number.')
        return
    }

    const post = await Post.findOne({ postNumber: args[1] })
    if (!post) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'The specified post couldn’t be found.')
        return
    }

    if (post.lockedDownAt) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'This post is already locked.')
        return
    }

    // Toggle the post's lock status
    post.lockedDownAt = Date.now()
    await post.save()

    // Update the post message with the new lock status
    await client.chat.update({
        channel: config.postChannelId,
        ts: post.postMessageId,
        text: `:lock: *#${post.postNumber}:* ${removeSpecialTags(post.body)}`
    })

    // Post status update in post thread. Attempt to get the parent message's ID.
    // If it's null, then this must already be the top-level message.
    const parentId = await getParentMessageId(client, config.postChannelId, post.postMessageId)
    await sendMessage(client, config.postChannelId, {
        text: ':lock: _This post is now locked. Anonymous replies sent after this will not be shown._',
        thread_ts: parentId || post.postMessageId
    })

    // Notify the command sender
    await sendEphemeralMessage(client, command.channel_id, command.user_id, ':+1: Post locked.')

    // Log status change
    const { permalink: postPermalink } = await client.chat.getPermalink({
        channel: config.postChannelId,
        message_ts: post.postMessageId
    })
    await sendMessage(client, config.streamChannelId, {
        text: `_<@${command.user_id}> locked <${postPermalink}|*#${post.postNumber}*>._`,
        unfurl_links: false
    })
}
