import crypto from 'crypto'
import { SubmissionLayout } from '../blocks'
import Post from '../models/post'
import { hash } from './'

export const createSubmission = async (client, channel, event) => {
    const salt = crypto.randomBytes(16).toString('hex')
    const newSubmission = new Post({
        body: event.text,
        authorIdHash: hash(event.user, salt),
        salt
    })

    // Create a ticket for the submission
    const props = {
        id: newSubmission.id,
        status: 'waiting',
        text: event.text
    }
    const reviewMessage = await sendMessage(client, channel, { blocks: SubmissionLayout(props) })
    newSubmission.reviewMessageId = reviewMessage.ts

    await newSubmission.save()
    return reviewMessage
}

export const getMessage = async (client, channel, ts) => {
    const { messages } = await client.conversations.replies({
        channel,
        ts,
        latest: ts,
        limit: 1
    })

    if (messages.length === 0) {
        return null
    }

    return messages[0]
}

export const getParentMessageId = async (client, channel, ts) => {
    const message = await getMessage(client, channel, ts)
    return message?.thread_ts
}

export const isUserInChannel = async (client, user, channel) => {
    for await (const page of client.paginate('conversations.members', { channel })) {
        if (page.members.includes(user)) {
            return true
        }
    }

    return false
}

export const sendEphemeralMessage = async (client, channel, user, opts) => {
    let options = { channel, user }
    if (typeof opts === 'string') {
        options.text = opts
    }
    options = { ...options, ...opts }

    const res = await client.chat.postEphemeral(options)
    return res
}

export const sendMessage = async (client, channel, opts) => {
    let options = { channel }
    if (typeof opts === 'string') {
        options.text = opts
    }
    options = { ...options, ...opts }

    const res = await client.chat.postMessage(options)
    return res
}
