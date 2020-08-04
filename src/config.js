const config = {
  databaseUrl: process.env.DATABASE_URL || process.env.MONGODB_URI,
  port: process.env.PORT || 3000,
  // Slack-specific config
  botToken: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  postChannelId: process.env.SLACK_POST_CHANNEL_ID,
  reviewChannelId: process.env.SLACK_REVIEW_CHANNEL_ID,
  streamChannelId: process.env.SLACK_STREAM_CHANNEL_ID
}

export default config
