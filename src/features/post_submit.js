import config from '../config'
import { channelType, noBotMessages, threaded } from '../middlewares'
import { createSubmission } from '../utils/slack'

export default app => {
    // Match non-command and non-reply DMs
    const messagePattern = /^(?!\/)(?!(#*)\d+:(\s|$))/
    app.message(channelType('im'), threaded(false), noBotMessages, messagePattern, async ({ client, event, say }) => {
        await say(`:mag: Your submission is now under review. Two quick things:
- If you were trying to send an anonymous reply, resend the message in the following format: \`<post number>: <your message here>\` (i.e., sending \`1337: hello\` would send “hello” to post *#1337*).
- If this is approved, you (and only you, the author) will be able to send anonymous reactions to the replies under your post by using the *Add anonymous reactions* shortcut, found under *More actions* → *More message shortcuts*.`)
        await createSubmission(client, config.reviewChannelId, event)
    })
}
