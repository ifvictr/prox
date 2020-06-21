export const ReplyModal = ({
    postNumber,
    user,
    username
}) => {
    const displayName = user ? `<@${user}>` : `@${username}`
    return {
        type: 'modal',
        callback_id: 'reply',
        title: {
            type: 'plain_text',
            text: 'Reply to post'
        },
        submit: {
            type: 'plain_text',
            text: 'Send'
        },
        blocks: [
            {
                type: 'input',
                block_id: 'reply_input',
                label: {
                    type: 'plain_text',
                    text: `What do you want to send as a reply to #${postNumber}?`
                },
                element: {
                    type: 'plain_text_input',
                    action_id: 'input_reply',
                    initial_value: displayName + ' ',
                    multiline: true
                }
            },
        ],
        private_metadata: JSON.stringify({ postNumber })
    }
}
