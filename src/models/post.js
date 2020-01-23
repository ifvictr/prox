import mongoose from 'mongoose'

const PostSchema = new mongoose.Schema({
    body: {
        type: String,
        required: true,
        immutable: true
    },
    authorIdHash: {
        type: String,
        required: true,
        immutable: true
    },
    salt: {
        type: String,
        required: true,
        immutable: true
    },
    reviewMessageId: {
        type: String,
        required: true,
        immutable: true
    },
    postMessageId: String,
    postNumber: Number,
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        immutable: true
    },
    approvedAt: Date
})

export default mongoose.model('Post', PostSchema)