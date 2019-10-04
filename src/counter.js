import Setting from './models/setting'

class Counter {
    async init() {
        // Only called on the first run
        if (!await Setting.exists({ name: 'count' })) {
            await Setting.create({ name: 'count', value: JSON.stringify(0) })
        }
    }

    async get() {
        const setting = await Setting.findOne({ name: 'count' })
        return JSON.parse(setting.value)
    }

    async set(newValue) {
        if (!Number.isInteger(newValue)) {
            throw new TypeError('newValue needs to be an integer')
        }
        const updatedSetting = await Setting.findOneAndUpdate(
            { name: 'count' },
            { value: JSON.stringify(newValue) },
            { new: true }
        )
        return JSON.parse(updatedSetting.value)
    }

    async increment() {
        const value = await this.get()
        const newValue = await this.set(value + 1)
        return newValue
    }
}

export default Counter