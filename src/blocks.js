export const SubmissionLayout = ({ id, isSensitive, postChannel, postNumber, status, text, user }) => {
    const displayName = `<@${user}>` || 'You’ve'
    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: ({
                    waiting: ':bell: You have a new submission to review!',
                    approved: `:+1: ${displayName} approved this submission. It’s now *#${postNumber}* in <#${postChannel}>.`,
                    rejected: `:-1: ${displayName} rejected this submission.`
                })[status] || ':rotating_light: Something went wrong.',
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `>>> ${text}`
            }
        },
        ...status === 'waiting'
            ? [{
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
                            text: `${isSensitive ? 'Unmark' : 'Mark'} as sensitive`
                        },
                        value: id
                    }
                ]
            }]
            : []
    ]
}
