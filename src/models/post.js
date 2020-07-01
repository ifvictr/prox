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
    markedSensitiveAt: Date,
    warningMessage: String
}, {
    timestamps: true
})

PostSchema.plugin(mongooseDelete, { deletedAt: true })

PostSchema.methods.isDuplicate = function () {
    return mongoose.model('Post').exists({
        body: this.body,
        approvedAt: { $ne: null }
    })
}

export default mongoose.model('Post', PostSchema)
