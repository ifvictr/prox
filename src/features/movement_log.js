import config from '../config'
import { channel } from '../middlewares'
import { sendMessage } from '../utils'

export default app => {
    app.event(channel(config.postChannelId), 'member_joined_channel', async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone joined <#${event.channel}>._`)
    })

    app.event(channel(config.postChannelId), 'member_left_channel', async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone left <#${event.channel}>._`)
    })
}
