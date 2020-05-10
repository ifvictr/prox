import mongoose from 'mongoose'
import mongooseDelete from 'mongoose-delete'

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
    lockedDownAt: Date,
    markedSensitiveAt: Date
}, {
    timestamps: true
})

PostSchema.plugin(mongooseDelete, { deletedAt: true })

export default mongoose.model('Post', PostSchema)
