import { HelpLayout } from '../../blocks'
import config from '../../config'
import { isUserInChannel } from '../../utils/slack'

// /prox help
export default async ({ client, command, respond }) => {
    const isReviewer = await isUserInChannel(client, command.user_id, config.reviewChannelId)
    await respond({
        blocks: HelpLayout({
            command: command.command,
            showReviewerFeatures: isReviewer
        })
    })
}
