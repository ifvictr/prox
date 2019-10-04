import { SubmissionLayout } from './blocks'
import Submission from './models/submission'

export const createSubmission = async (bot, channel, text) => {
    const newSubmission = new Submission({ body: text })

    // Create a ticket for the submission
    const props = { id: newSubmission._id, status: 'waiting', text }
    const reviewMessage = await sendMessage(bot, channel, { blocks: SubmissionLayout(props) })
    newSubmission.messageId = reviewMessage.id

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