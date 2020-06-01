import { App } from '@slack/bolt'
import mongoose from 'mongoose'
import config from './config'
import counter from './counter'
import * as features from './features'
import { sendMessage } from './utils/slack'

const init = async () => {
    console.log('Starting Prox…')

    // Set up database connection
    await mongoose.connect(config.databaseUrl, {
        useFindAndModify: false,
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    await counter.init()

    // Initialize Slack app
    const app = new App({
        signingSecret: config.signingSecret,
        token: config.botToken
    })

    // Load feature modules
    for (const [featureName, handler] of Object.entries(features)) {
        handler(app)
        console.log(`Loaded feature module: ${featureName}`)
    }

    const featuresCount = Object.keys(features).length
    console.log(`Loaded ${featuresCount} feature${featuresCount === 1 ? '' : 's'}`)

    // Start receiving events
    await app.start(config.port)
    console.log(`Listening on port ${config.port}`)

    await sendMessage(app.client, config.streamChannelId, {
        token: config.botToken,
        channel: config.streamChannelId,
        text: ':rocket: _Prox is now online!_'
    })
}

init()
