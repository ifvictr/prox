import { removeSpecialTags } from '../utils'

export default ({
    postNumber,
    postPermalink,
    targetMessageId,
    text,
    user,
    username
}) => {
    const displayName = user ? `<@${user}>` : `*${username}*`
    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:wave: Hey! To send anonymous reactions to ${displayName}’s reply under <${postPermalink}|*#${postNumber}*> (also shown below), add the reactions to this message like you normally would, then click *Send reactions* when you’re done.`
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `>>> ${removeSpecialTags(text)}`
            }
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    action_id: 'reaction_send',
                    style: 'primary',
                    text: {
                        type: 'plain_text',
                        text: 'Send reactions'
                    },
                    value: targetMessageId
                },
                {
                    type: 'button',
                    action_id: 'reaction_cancel',
                    text: {
                        type: 'plain_text',
                        text: 'Cancel'
                    }
                }
            ]
        }
    ]
}
