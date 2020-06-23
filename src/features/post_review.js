import { AddWarningModal, SubmissionLayout } from '../blocks'
import config from '../config'
import counter from '../counter'
import Post from '../models/post'
import { removeSpecialTags } from '../utils'
import { sendEphemeralMessage, sendMessage } from '../utils/slack'

export default app => {
    app.action('post_approve', async ({ ack, action, body, client }) => {
        await ack()

        const id = action.value
        const submission = await Post.findById(id)
        // Handle edge case where ticket isn't in database
        if (!submission) {
            await sendMessage(client, body.channel.id, {
                text: ':rotating_light: Something went wrong. Reason: `submission not found`',
                thread_ts: body.message_ts
            })
            return
        }

        if (submission.approvedAt) {
            await sendEphemeralMessage(client, body.channel.id, body.user.id, 'This submission has already been approved.')
            return
        }

        const newCount = await counter.increment()
        const mainContent = `*#${newCount}:* ${removeSpecialTags(submission.body)}`
        let postMessage = await sendMessage(client, config.postChannelId,
            submission.markedSensitiveAt
                ? `:warning: *#${newCount}* includes potentially sensitive content. Here’s the warning from reviewers:
> ${removeSpecialTags(submission.warningMessage)}
If you still want to read it, click on *View thread*.`
                : mainContent)

        // If the post is marked sensitive, post in the thread and save that message ID instead.
        // We can always retrieve the parent message's ID if we need it in the future.
        if (submission.markedSensitiveAt) {
            postMessage = await sendMessage(client, config.postChannelId, {
                text: mainContent,
                thread_ts: postMessage.ts
            })
        }

        submission.postMessageId = postMessage.ts
        submission.postNumber = newCount
        submission.approvedAt = Date.now()

        await submission.save()

        const { permalink: postPermalink } = await client.chat.getPermalink({
            channel: config.postChannelId,
            message_ts: submission.postMessageId
        })
        const props = {
            id,
            isSensitive: Boolean(submission.markedSensitiveAt),
            postChannel: config.postChannelId,
            postNumber: submission.postNumber,
            postPermalink,
            status: 'approved',
            text: submission.body,
            user: body.user.id
        }
        await client.chat.update({
            channel: config.reviewChannelId,
            ts: submission.reviewMessageId,
            blocks: SubmissionLayout(props)
        })

        await sendMessage(client, config.streamChannelId, {
            text: `_<@${body.user.id}> approved a submission:_\n>>> ${removeSpecialTags(submission.body)}`,
            unfurl_links: false
        })
    })

    app.action('post_reject', async ({ ack, action, body, client }) => {
        await ack()

        const id = action.value
        const submission = await Post.findById(id)
        // Handle edge case where ticket isn't in database
        if (!submission) {
            await sendMessage(client, body.channel.id, {
                text: ':rotating_light: Something went wrong. Reason: `submission not found`',
                thread_ts: body.message_ts
            })
            return
        }

        if (submission.deleteAt) {
            await sendEphemeralMessage(client, body.channel.id, body.user.id, 'This submission has already been rejected.')
            return
        }

        await submission.delete()

        const props = {
            id,
            isSensitive: Boolean(submission.markedSensitiveAt),
            postChannel: config.postChannelId,
            postNumber: submission.postNumber,
            status: 'rejected',
            text: submission.body,
            user: body.user.id
        }
        await client.chat.update({
            channel: config.reviewChannelId,
            ts: submission.reviewMessageId,
            blocks: SubmissionLayout(props)
        })

        await sendMessage(client, config.streamChannelId, {
            text: `_<@${body.user.id}> rejected a submission:_\n>>> ${removeSpecialTags(submission.body)}`,
            unfurl_links: false
        })
    })

    app.action('post_toggle_sensitive', async ({ ack, action, body, client }) => {
        await ack()

        const id = action.value
        const submission = await Post.findById(id)
        // Handle edge case where ticket isn't in database
        if (!submission) {
            await sendMessage(client, body.channel.id, {
                text: ':rotating_light: Something went wrong. Reason: `submission not found`',
                thread_ts: body.message_ts
            })
            return
        }

        // If the user is trying to add a warning, open a modal instead
        if (!submission.markedSensitiveAt) {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: AddWarningModal({ postId: submission.id })
            })
            return
        }

        submission.markedSensitiveAt = null
        submission.warningMessage = null
        await submission.save()

        // Update the review message
        const props = {
            id,
            isSensitive: false,
            status: 'waiting',
            text: submission.body
        }
        await client.chat.update({
            channel: config.reviewChannelId,
            ts: submission.reviewMessageId,
            blocks: SubmissionLayout(props)
        })

        // Send update in thread
        await sendMessage(client, config.reviewChannelId, {
            text: `_<@${body.user.id}> removed the warning._`,
            thread_ts: submission.reviewMessageId
        })
    })

    app.view('add_warning', async ({ ack, body, client, view }) => {
        await ack()

        const { postId } = JSON.parse(view.private_metadata)
        const warningMessage = view.state.values.warning_input.input_warning.value

        const submission = await Post.findById(postId)
        // Handle edge case where ticket isn't in database
        if (!submission) {
            await sendMessage(client, body.channel.id, {
                text: ':rotating_light: Something went wrong. Reason: `submission not found`',
                thread_ts: body.message_ts
            })
            return
        }

        submission.markedSensitiveAt = Date.now()
        submission.warningMessage = warningMessage
        await submission.save()

        // Update the review message
        const props = {
            id: postId,
            isSensitive: true,
            status: 'waiting',
            text: submission.body,
            user: body.user.id,
            warningMessage
        }
        await client.chat.update({
            channel: config.reviewChannelId,
            ts: submission.reviewMessageId,
            blocks: SubmissionLayout(props)
        })

        // Send update in thread
        await sendMessage(client, config.reviewChannelId, {
            text: `_<@${body.user.id}> added a warning:_\n>>> ${removeSpecialTags(warningMessage)}`,
            thread_ts: submission.reviewMessageId
        })
    })
}
