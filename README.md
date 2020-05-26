<p align="center">
    <img alt="Prox" width="128" src="https://files.ifvictr.com/2020/04/prox.png" />
</p>
<h1 align="center">Prox</h1>
<p align="center"><i>Share anonymous confessions on Slack.</i></p>

## Deploy

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Setup

Prox comprises of two components: the Slack app and the web server for receiving events from Slack.

### Creating the Slack app

For this app to work, you’ll need to register a Slack app with the appropriate OAuth permissions, event subscriptions, and commands.

### Environment variables

```bash
MONGODB_URI=
SLACK_CLIENT_BOT_TOKEN=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_CLIENT_SIGNING_SECRET=
SLACK_REVIEW_CHANNEL_ID=
SLACK_POST_CHANNEL_ID=
```

### Running the web server

_This section is only relevent to you if you’ve decided to run Prox on a platform other than Heroku._

```bash
# Install dependencies
yarn

# Start Prox in production! This will build the source files and then run them.
yarn start
# Or, if you need to run it in development mode instead.
yarn dev
```

## License

[MIT](LICENSE.txt)
