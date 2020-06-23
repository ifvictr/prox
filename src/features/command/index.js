import deleteSubcommand from './delete'
import helpSubcommand from './help'
import lockSubcommand from './lock'
import unlockSubcommand from './unlock'
import versionSubcommand from './version'
import { sendEphemeralMessage } from '../../utils/slack'

export default app => {
    const subcommands = new Map([
        ['delete', deleteSubcommand],
        ['help', helpSubcommand],
        ['lock', lockSubcommand],
        ['unlock', unlockSubcommand],
        ['version', versionSubcommand],
        ['', helpSubcommand]
    ])

    app.command('/prox', async ({ ack, ...middlewareArgs }) => {
        await ack()

        const { client, command } = middlewareArgs

        // Find the subcommand
        const args = command.text.split(/\s+/)
        const subcommand = args[0].toLowerCase()
        if (!subcommands.has(subcommand)) {
            await sendEphemeralMessage(client, command.channel_id, command.user_id, `Command not found. Try running \`${command.command}\` to see all the available ones.`)
            return
        }

        // Pass off control to the handler
        const subcommandHandler = subcommands.get(subcommand)
        await subcommandHandler(middlewareArgs, args)
    })
}
