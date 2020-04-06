import Post from '../models/post'
import { getParentMessageId, isUserInChannel } from '../utils'

// /prox lockdown <post number>
export default async (bot, message, args) => {
    // Check if the user is part of the review channel
    if (!(await isUserInChannel(bot.api, message.user, process.env.SLACK_REVIEW_CHANNEL_ID))) {
        await bot.replyEphemeral(message, 'You don’t have permission to run this command.')
        return
    }

    if (!args[1]) {
        await bot.replyEphemeral(message, 'Please specify a post number.')
        return
    }

    if (isNaN(args[1])) {
        await bot.replyEphemeral(message, 'Input must be a post number.')
        return
    }

    const post = await Post.findOne({ postNumber: args[1] })
    if (!post) {
        await bot.replyEphemeral(message, 'The specified post couldn’t be found.')
        return
    }

    post.lockedDownAt = post.lockedDownAt ? null : Date.now() // Toggle the post's lockdown status
    await post.save()

    await bot.replyEphemeral(message, 'Lockdown status updated.')

    // Update the post message with the new lock status
    const updatedMessage = {
        id: post.postMessageId,
        conversation: { id: process.env.SLACK_POST_CHANNEL_ID },
        text: `${post.lockedDownAt ? ':lock: ' : ''}*#${post.postNumber}:* ${post.body}`
    }
    await bot.updateMessage(updatedMessage)

    // Post status update in post thread
    const parentId = await getParentMessageId(bot.api, process.env.SLACK_POST_CHANNEL_ID, post.postMessageId)

    await bot.startConversationInThread(process.env.SLACK_POST_CHANNEL_ID, null, parentId)
    await bot.say(post.lockedDownAt
        ? ':lock: _This post is now on lockdown. Anonymous replies sent after this will not be shown._'
        : ':unlock: _This post is no longer on lockdown. Anonymous replies sent will be shown again._')
}
