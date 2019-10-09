import mongoose from 'mongoose'

const SubmissionSchema = new mongoose.Schema({
    body: String,
    messageId: String
})

export default mongoose.model('Submission', SubmissionSchema)