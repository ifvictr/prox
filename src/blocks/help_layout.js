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
3. Run *\`${command}\`* to see this message again.`
        }
    },
    {
        type: 'header',
        text: {
            type: 'plain_text',
            text: ':zap: Shortcuts'
        }
    },
    {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `
• *Add anonymous reactions:* Send reactions to a message under a post. Only works if you created it.
• *Send anonymous reply:* Send a reply to a post without having to switch to DM.\n
All shortcuts can be found under *More actions* → *More message shortcuts*.`
        }
    },
    ...showReviewerFeatures
        ? [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: ':mag: Reviewer Tools'
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `
Here’s a list of available commands along with their parameters:\n
• *\`${command} delete <post number|url> [hard]\`:* Deletes the specified post or reply comment from the post channel by replacing the message contents. If \`hard\` is specified, the message will be completely deleted.
• *\`${command} lock <post number>\`:* Locks the specified post.
• *\`${command} unlock <post number>\`:* Unlocks the specified post.
• *\`${command} version\`:* See Prox’s version number.`
                }
            }
        ]
        : []
])
