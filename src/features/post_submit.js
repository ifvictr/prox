import config from '../config'
import { channelType, threaded } from '../middlewares'
import { createSubmission } from '../utils/slack'

export default app => {
    // Match non-command DMs
    const messagePattern = /^(?!\/).*/
    app.message(channelType('im'), threaded(false), messagePattern, async ({ client, event, say }) => {
        await say(':mag: Your submission is now under review. If you were trying to send an anonymous reply, resend it in the following format: `<post number>: <your message here>` (i.e., sending `1337: hello` would send “hello” to post *#1337*).')
        await createSubmission(client, config.reviewChannelId, event)
    })
}
