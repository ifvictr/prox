import { HelpLayout } from '../../blocks'
import config from '../../config'
import { isUserInChannel, sendEphemeralMessage } from '../../utils/slack'

// /prox help
export default async ({ client, command }) => {
    const isReviewer = await isUserInChannel(client, command.user_id, config.reviewChannelId)
    await sendEphemeralMessage(client, command.channel_id, command.user_id, {
        blocks: HelpLayout({
            command: command.command,
            showReviewerFeatures: isReviewer
        })
    })
}
