export const HelpLayout = ({
    command = '/prox',
    showReviewerFeatures = false
} = {}) => ([
    {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `:wave: Hey, I’m Prox! Here are the basics to get you started:\n
1. DM me to submit a post! It’ll be sent to a channel for review, where the only thing the reviewers see is your message. No information about you is ever shown.
2. To reply anonymously to a post, DM me in this format: \`<post number>: <your message here>\`. If you wanted to reply with “hello” to post *#16*, send \`16: hello\`.
3. Run *\`${command}\`* to see this message up again.
            `
        }
    },
    ...showReviewerFeatures
        ? [
            {
                type: 'divider'
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `I also noticed that you’re a reviewer. Here’s a list of available commands along with their parameters:\n
- *\`${command} delete <post number|url> [hard]\`:* Deletes the specified post or reply comment from the post channel by replacing the message contents. If \`hard\` is specified, the message will be completely deleted.
- *\`${command} lockdown <post number>\`:* Toggles the lockdown status of a post.
                    `
                }
            }
        ]
        : []
])
