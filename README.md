<p align="center">
    <img alt="Prox" width="128" src="https://files.ifvictr.com/2020/04/prox.png" />
</p>
<h1 align="center">Prox</h1>
<p align="center">
    <i>Share anonymous confessions in Slack.</i>
</p>

## Deploy

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Setup

Prox comprises of three components:

1. The web server for receiving and responding to event payloads from Slack
2. A **MongoDB database** for saving the current post number, submitted posts, user pseudonyms, etc.
3. The Slack app itself

### Environment variables

Here are all the variables you need to set up on the server, with hints.

```bash
# Port to run the server on
PORT=3000

DATABASE_URL=mongodb://…

# App config. Obtained from the "Basic Information" page of your app.
SLACK_BOT_TOKEN=xoxb-…
SLACK_SIGNING_SECRET=…

# Slack channels where the app should post to. The review and stream channels are highly recommended to be private channels.
SLACK_POST_CHANNEL_ID=CXXXXXXXX
SLACK_REVIEW_CHANNEL_ID=GXXXXXXXX
SLACK_STREAM_CHANNEL_ID=GXXXXXXXX
```

### Starting the server

_This section is only relevent to you if you’ve decided to run Prox on a platform other than Heroku._

```bash
git clone https://github.com/ifvictr/prox
cd prox

# Install dependencies
yarn

# Start Prox in production! This will build the source files and then run them.
yarn start
# Or, if you need to run it in development mode instead.
yarn dev
```

### Creating the Slack app

For Prox to work, you’ll need to [register a Slack app](https://api.slack.com/apps) with the appropriate OAuth permissions, event subscriptions, and commands.

#### Interactivity & Shortcuts

For the **Request URL** under the **Interactivity** section, enter `http://<YOUR DOMAIN HERE>/slack/events`. This will be used for the app’s buttons.

#### Slash Commands

The following commands are needed. Enter the same request URL you used in the previous section.

- `/prox`: Learn how to use Prox

#### OAuth & Permissions

Install the Slack app to your Slack workspace first.

The following bot token scopes are required:

- `channels:read`: Used for logging movement events.
- `chat:write`: Used for sending messages.
- `chat:write.customize`: Used for sending anonymous replies with pseudonyms and icons that distinguish different repliers.
- `commands`: Used for `/prox`.
- `groups:read`: Used for logging movement events.
- `im:history`: Used for receiving submissions via DMs from users.
- `im:write`: Used for starting DM channels with users, which can then be used to send anonymous reaction prompts when needed.
- `reactions:write`: Used for adding anonymous reactions.

#### Event Subscriptions

Subscribe to the following bot events:

- `app_home_opened`
- `member_joined_channel`
- `member_left_channel`
- `message.im`

The request URL is also the same here.

After you’ve followed all the above steps, you should see something like this in the console:

```bash
Starting Prox…
Listening on port 3000
```

## License

[MIT License](LICENSE.txt)
