import mongoose from 'mongoose'
import uuidv4 from 'uuid/v4'

const SubmissionSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    body: String,
    messageId: String
})

export default mongoose.model('Submission', SubmissionSchema)