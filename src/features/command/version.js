import { sendEphemeralMessage } from '../../utils/slack'
import pkg from '../../../package.json'

// /prox version
export default async ({ client, command }) => {
    await sendEphemeralMessage(client, command.channel_id, command.user_id, `You are using *v${pkg.version}*.`)
}
