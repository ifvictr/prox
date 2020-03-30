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
    approvedAt: Date,
    lockedDownAt: Date
}, {
    timestamps: true
})

export default mongoose.model('Post', PostSchema)
