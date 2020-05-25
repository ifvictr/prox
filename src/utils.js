import crypto from 'crypto'
import { URL } from 'url'
import { SubmissionLayout } from './blocks'
import adjectives from './data/adjectives.json'
import animals from './data/animals.json'
import icons from './data/icons.json'
import Post from './models/post'

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

export const getIdFromUrl = inputUrl => {
    const url = new URL(inputUrl)
    const lastSegment = url.pathname.slice(url.pathname.lastIndexOf('/') + 1)

    // Attempt to find ID in the URL. Format: pXXXXXXXXXXXXXXXX
    if (!lastSegment.startsWith('p') && lastSegment.length !== 17) {
        return null
    }

    const id = lastSegment.slice(1) // XXXXXXXXXXXXXXXX
    const insertPos = id.length - 6
    // NOTE: Slack's web API is picky about the period. Now formatted as XXXXXXXXXX.XXXXXX
    const formattedId = id.slice(0, insertPos) + '.' + id.slice(insertPos)
    return formattedId
}

export const getParentMessageId = async (api, channel, ts) => {
    const { messages } = await api.conversations.replies({
        channel,
        ts,
        latest: ts,
        limit: 1
    })

    if (messages.length === 0) {
        return null
    }

    return messages[0].thread_ts
}

export const getPreview = (length, text) => {
    if (text.length <= length) {
        return text
    }

    return text.substring(0, length) + '…'
}

export const hash = (value, salt) => crypto.createHash('sha256')
    .update(value)
    .update(salt).digest('hex').toString()

export const isUserInChannel = async (api, user, channel) => {
    // TODO: Handle pagination
    const res = await api.conversations.members({ channel })
    return res.members.includes(user)
}

export const getPseudonym = hash => ({
    adjective: adjectives[parseInt(hash.slice(0, 32), 16) % adjectives.length],
    animal: animals[parseInt(hash.slice(32, hash.length), 16) % animals.length]
})

export const toPrettyPseudonym = hash => {
    const { adjective, animal } = getPseudonym(hash)
    return capitalize(adjective) + ' ' + capitalize(animal)
}

export const getIcon = hash => {
    const { animal } = getPseudonym(hash)
    return icons[animal]
}

// Inserts zero-width non-joiner to prevent special tags like "@everyone" and "<!channel|channel>" from working
export const removeSpecialTags = str => str
    .replace(/@(channel|everyone|here)/ig, '@\u200c$1')
    .replace(/\<\!(channel|everyone|here)\|(.*?)\>/ig, '<\u200c!$1|$2>')
