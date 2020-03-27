import mongoose from 'mongoose'

const SettingSchema = new mongoose.Schema({
    name: String,
    value: String
})

export default mongoose.model('Setting', SettingSchema)
