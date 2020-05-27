import isUrl from 'is-url'
import config from '../../config'
import Post from '../../models/post'
import { getIdFromUrl, getPreview, isUserInChannel, sendEphemeralMessage, sendMessage } from '../../utils'

// /prox delete <post number|url> [hard]
export default async ({ client, command }, args) => {
    // Check if the user is part of the review channel
    if (!(await isUserInChannel(client, command.user_id, config.reviewChannelId))) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'You don’t have permission to run this command.')
        return
    }

    if (!args[1]) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'Please specify a post number or message URL.')
        return
    }

    // Check if target is post or thread reply
    let messageId
    let post
    if (isUrl(args[1])) { // Is URL?
        messageId = getIdFromUrl(args[1])
        if (!messageId) {
            await sendEphemeralMessage(client, command.channel_id, command.user_id, 'Couldn’t extract a message ID from the given URL.')
            return
        }

        // Attempt to find a post the link was pointing to
        post = await Post.findOne({ postMessageId: messageId })
    } else if (!isNaN(args[1])) { // Is post number?
        post = await Post.findOne({ postNumber: args[1] })
        if (!post) {
            await sendEphemeralMessage(client, command.channel_id, command.user_id, 'The specified post couldn’t be found.')
            return
        }

        messageId = post.postMessageId
    } else { // Is invalid input
        await sendEphemeralMessage(client, command.channel_id, command.user_id, 'Input must be a post number or message URL.')
        return
    }

    // Delete the message using retrieved ID
    try {
        const options = {
            channel: config.postChannelId,
            ts: messageId,
            text: `:skull: ${post ? `*#${post.postNumber}:* _This post` : '_This message'} has been deleted._`
        }

        // Delete depending on sender's specified method. Defaults to soft
        if (args[2] === 'hard') {
            await client.chat.delete(options)
        } else {
            await client.chat.update(options)
        }

        if (post) {
            await post.delete()
            await sendMessage(client, config.streamChannelId, `_<@${command.user_id}> deleted *#${post.postNumber}*:_\n>>> ${getPreview(50, post.body)}`)
        }

        await sendEphemeralMessage(client, command.channel_id, command.user_id, `${post ? 'Post' : 'Message'} deleted.`)
    } catch (e) {
        await sendEphemeralMessage(client, command.channel_id, command.user_id, `Failed to delete. Reason: \`${e.data.error}\``)
    }
}
