import { removeSpecialTags } from '../utils'

export const AddReactionsPrompt = ({
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
        text: `:wave: Hey! To add anonymous reactions to ${displayName}’s reply under <${postPermalink}|*#${postNumber}*> (also shown below), react to *this direct message* like you normally would, then click *Send reactions* when you’re done.`
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
          action_id: 'reactions_send',
          style: 'primary',
          text: {
            type: 'plain_text',
            text: 'Send reactions'
          },
          value: targetMessageId
        },
        {
          type: 'button',
          action_id: 'reactions_cancel',
          text: {
            type: 'plain_text',
            text: 'Cancel'
          }
        }
      ]
    }
  ]
}
