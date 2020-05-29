import config from '../config'
import { channel } from '../middlewares'
import { sendMessage } from '../utils/slack'

export default app => {
    app.event('member_joined_channel', channel(config.postChannelId), async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone joined <#${event.channel}>._`)
    })

    app.event('member_left_channel', channel(config.postChannelId), async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone left <#${event.channel}>._`)
    })
}
