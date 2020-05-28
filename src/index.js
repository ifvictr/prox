import { App } from '@slack/bolt'
import mongoose from 'mongoose'
import config from './config'
import Counter from './counter'
import * as features from './features'

// Set up MongoDB
mongoose.connect(config.databaseUrl, {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true
})

// Set up Slack adapter
const app = new App({
    signingSecret: config.signingSecret,
    token: config.botToken,
    endpoints: '/api/messages'
})
export const counter = new Counter()

    ; (async () => {
        console.log('Starting Prox…')

        await app.start(config.port)
        await counter.init()

        // Load feature modules
        for (const [featureName, handler] of Object.entries(features)) {
            handler(app)
            console.log(`Loaded feature module: ${featureName}`)
        }

        const featuresCount = Object.keys(features).length
        console.log(`Loaded ${featuresCount} feature${featuresCount === 1 ? '' : 's'}`)
    })()
