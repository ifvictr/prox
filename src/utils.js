import crypto from 'crypto'
import { SubmissionLayout } from './blocks'
import Post from './models/post'
import adjectives from './words/adjectives.json'
import animals from './words/animals.json'

export const createSubmission = async (bot, channel, message) => {
    const salt = crypto.randomBytes(16).toString('hex')
    const newSubmission = new Post({
        body: message.text,
        authorIdHash: hash(message.user, salt),
        salt
    })

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

export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1)

export const hash = (value, salt) => crypto.createHash('sha256')
    .update(value)
    .update(salt).digest('hex').toString()

export const toPseudonym = hash => {
    const adjective = adjectives[parseInt(hash.slice(0, 32), 16) % adjectives.length]
    const animal = animals[parseInt(hash.slice(32, hash.length), 16) % animals.length]

    return capitalize(adjective) + ' ' + capitalize(animal)
}