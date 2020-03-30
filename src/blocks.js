export const SubmissionLayout = ({ id, status, text, user }) => {
    const displayName = `<@${user}>` || 'You’ve'
    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: ({
                    waiting: ':bell: You have a new submission to review!',
                    approved: `:+1: ${displayName} approved this message.`,
                    rejected: `:-1: ${displayName} rejected this message.`
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
                block_id: id,
                elements: [
                    {
                        type: 'button',
                        style: 'primary',
                        text: {
                            type: 'plain_text',
                            text: 'Approve'
                        },
                        value: 'approved'
                    },
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Reject'
                        },
                        value: 'rejected'
                    }
                ]
            }]
            : []
    ]
}
