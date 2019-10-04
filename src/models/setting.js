import mongoose from 'mongoose'

const SettingSchema = new mongoose.Schema({
    name: String,
    value: String
}, { autoIndex: false })

export default mongoose.model('Setting', SettingSchema)