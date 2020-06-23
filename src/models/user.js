import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        immutable: true
    }
}, {
    timestamps: true
})

export default mongoose.model('User', UserSchema)
