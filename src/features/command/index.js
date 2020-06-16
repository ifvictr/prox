import deleteSubcommand from './delete'
import helpSubcommand from './help'
import lockdownSubcommand from './lockdown'
import { sendEphemeralMessage } from '../../utils/slack'

export default app => {
    const subcommands = new Map([
        ['delete', deleteSubcommand],
        ['help', helpSubcommand],
        ['lockdown', lockdownSubcommand],
        ['', helpSubcommand]
    ])

    app.command('/prox', async ({ ack, ...middlewareArgs }) => {
        await ack()

        const { client, command } = middlewareArgs

        // Find the subcommand
        const args = command.text.split(/\s+/)
        const subcommand = args[0].toLowerCase()
        if (!subcommands.has(subcommand)) {
            await sendEphemeralMessage(client, command.channel_id, command.user_id, `Subcommand not found. To see all the available commands, run \`${command.command} help\`.`)
            return
        }

        // Pass off control to the handler
        const subcommandHandler = subcommands.get(subcommand)
        await subcommandHandler(middlewareArgs, args)
    })
}
