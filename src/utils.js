import { SubmissionLayout } from './blocks'
import Post from './models/post'

export const createSubmission = async (bot, channel, message) => {
    const newSubmission = new Post({ body: message.text })

    // Create a ticket for the submission
    const props = { id: newSubmission._id, status: 'waiting', text: message.text }
    const reviewMessage = await sendMessage(bot, channel, { blocks: SubmissionLayout(props) })
    newSubmission.reviewMessageId = reviewMessage.id

    await newSubmission.save()
    return reviewMessage
}

export const sendMessage = async (bot, channel, message) => {
    const originalContext = bot._config.reference
    await bot.startConversationInChannel(channel)
    const sentMessage = await bot.say(message)
    await bot.changeContext(originalContext)
    return sentMessage
}