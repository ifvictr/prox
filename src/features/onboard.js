import { HelpLayout } from '../blocks'
import User from '../models/user'
import { sendMessage } from '../utils/slack'

export default app => {
    app.event('app_home_opened', async ({ client, event }) => {
        if (event.tab !== 'messages') {
            return
        }

        // If the user hasn't DMed us before, send them the help message
        const userFilter = { _id: event.user }
        if (!await User.exists(userFilter)) {
            await User.create(userFilter)
            await sendMessage(client, event.channel, { blocks: HelpLayout() })
        }
    })
}
