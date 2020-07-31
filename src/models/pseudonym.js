import mongoose from 'mongoose'
import { capitalize } from '../utils'

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
  adjective: {
    type: String,
    required: true
  },
  noun: {
    type: String,
    required: true
  }
})

PseudonymSchema.virtual('name').get(function () {
  return `${capitalize(this.adjective)} ${capitalize(this.noun)}`
})

export default mongoose.model('Pseudonym', PseudonymSchema)
