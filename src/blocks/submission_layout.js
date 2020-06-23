import { removeSpecialTags } from '../utils'

export const SubmissionLayout = ({
    id,
    isSensitive,
    postChannel,
    postNumber,
    postPermalink,
    status,
    text,
    user,
    warningMessage
}) => {
    const displayName = `<@${user}>` || 'You’ve'
    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: ({
                    waiting: ':bell: You have a new submission to review!',
                    approved: `:+1: ${displayName} approved this submission. It’s now <${postPermalink}|*#${postNumber}*> in <#${postChannel}>.`,
                    rejected: `:-1: ${displayName} rejected this submission.`
                })[status] || ':rotating_light: Something went wrong.',
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `>>> ${removeSpecialTags(text)}`
            }
        },
        ...status === 'waiting'
            ? [
                ...isSensitive
                    ? [{
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:warning: A warning was added by <@${user}>:\n> ${removeSpecialTags(warningMessage)}`
                        }
                    }]
                    : [],
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            action_id: 'post_approve',
                            style: 'primary',
                            text: {
                                type: 'plain_text',
                                text: 'Approve'
                            },
                            value: id
                        },
                        {
                            type: 'button',
                            action_id: 'post_reject',
                            text: {
                                type: 'plain_text',
                                text: 'Reject'
                            },
                            value: id
                        },
                        {
                            type: 'button',
                            action_id: 'post_toggle_sensitive',
                            text: {
                                type: 'plain_text',
                                text: `${isSensitive ? ':heavy_minus_sign: Remove' : ':heavy_plus_sign: Add'} warning`
                            },
                            value: id
                        }
                    ]
                }]
            : []
    ]
}
