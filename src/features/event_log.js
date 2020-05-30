import { subtype } from '@slack/bolt'
import config from '../config'
import { channel } from '../middlewares'
import { removeSpecialTags } from '../utils'
import { sendMessage } from '../utils/slack'

export default app => {
    app.event('member_joined_channel', channel(config.postChannelId), async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone joined <#${event.channel}>._`)
    })

    app.event('member_left_channel', channel(config.postChannelId), async ({ client, event }) => {
        await sendMessage(client, config.streamChannelId, `_Someone left <#${event.channel}>._`)
    })

    app.message(subtype('message_deleted'), channel(config.postChannelId), async ({ client, context, message }) => {
        // Only log deletions of Prox's messages
        const deletedMessage = message.previous_message
        if (!(deletedMessage.user === context.botUserId || deletedMessage.bot_id === context.botId)) {
            return
        }

        const displayName = deletedMessage.user ? `<@${deletedMessage.user}>` : deletedMessage.username
        await sendMessage(client, config.streamChannelId, `_A ${!deletedMessage.thread_ts ? 'post' : 'message'} from ${displayName} was deleted in <#${config.postChannelId}>:_\n>>> ${removeSpecialTags(deletedMessage.text)}`)
    })
}
