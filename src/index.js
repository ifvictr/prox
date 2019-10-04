import { Botkit } from 'botkit'
import { SlackAdapter, SlackEventMiddleware, SlackMessageTypeMiddleware } from 'botbuilder-adapter-slack'
import mongoose from 'mongoose'
import { SubmissionLayout } from './blocks'
import Submission from './models/submission'
import { createSubmission, sendMessage } from './utils'

// Set up MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })

// Set up Slack adapter
const adapter = new SlackAdapter({
    clientSigningSecret: process.env.SLACK_CLIENT_SIGNING_SECRET,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    scopes: ['bot', 'chat:write:bot'],
    botToken: process.env.SLACK_CLIENT_BOT_TOKEN
})
adapter.use(new SlackEventMiddleware())
adapter.use(new SlackMessageTypeMiddleware())

const controller = new Botkit({ adapter })
let count = 0 // TODO: Persist via storage

controller.hears('.*', 'direct_message', async (bot, message) => {
    await bot.say(':mag: Your message has been submitted for review')
    await createSubmission(bot, process.env.SLACK_ADMIN_CHANNEL_ID, message.text)
})

// NOTE: The controller doesn't emit the `block_actions` event for some reason.
// Instead, we'll catch the parent event and then look for it.
controller.on('message', async (bot, message) => {
    if (message.incoming_message.channelData.type !== 'block_actions') {
        return
    }

    const id = message.actions[0].block_id
    const submission = await Submission.findById(id).exec()
    // Handle edge case where ticket isn't in database
    if (!submission) {
        await bot.startConversationInThread(message.channel, message.user, message.message.ts)
        await bot.say(':rotating_light: Something went wrong. Reason: `submission not found`')
        return
    }

    const status = message.text
    if (status === 'approved') {
        // TODO: Get the current count and add it
        const currentCount = ++count
        // TODO: Save the new count

        await sendMessage(bot, process.env.SLACK_POST_CHANNEL_ID, `${currentCount}. ${submission.body}`)
    }

    // Update the ticket's status message
    const props = { id, status, text: submission.body }
    await bot.replyInteractive(message, { blocks: SubmissionLayout(props) })

    // Delete the processed submission
    await Submission.deleteOne({ _id: id }).exec()
})