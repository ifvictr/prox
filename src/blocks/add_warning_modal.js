export const AddWarningModal = ({ postId }) => ({
    type: 'modal',
    callback_id: 'add_warning',
    title: {
        type: 'plain_text',
        text: 'Prox'
    },
    submit: {
        type: 'plain_text',
        text: 'Add warning'
    },
    blocks: [
        {
            type: 'input',
            block_id: 'warning_input',
            label: {
                type: 'plain_text',
                text: 'What should readers be warned about?'
            },
            element: {
                type: 'plain_text_input',
                action_id: 'input_warning',
                max_length: 100
            }
        },
    ],
    private_metadata: JSON.stringify({ postId })
})
