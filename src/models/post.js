import mongoose from 'mongoose'

const PostSchema = new mongoose.Schema({
    body: String,
    reviewMessageId: String,
    postMessageId: String
})

export default mongoose.model('Post', PostSchema)