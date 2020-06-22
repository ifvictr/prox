import mongoose from 'mongoose'

const PseudonymSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        immutable: true
    },
    userIdHash: {
        type: String,
        required: true,
        immutable: true
    },
    name: {
        type: String,
        required: true
    }
})

export default mongoose.model('Pseudonym', PseudonymSchema)
