import deleteSubcommand from './delete'
import lockdownSubcommand from './lockdown'

export default app => {
    const subcommands = new Map([
        ['delete', deleteSubcommand],
        ['lockdown', lockdownSubcommand]
    ])

    app.command('/prox', async ({ ack, client, command }) => {
        await ack()

        const args = command.text.split(/\s+/)
        const subcommand = args[0].toLowerCase()
        if (!subcommands.has(subcommand)) {
            await sendEphemeralMessage(client, command.channel_id, command.user_id, 'Subcommand not found.')
            return
        }

        // Pass control to appropriate handler
        const subcommandHandler = subcommands.get(subcommand)
        await subcommandHandler(client, command, args)
    })
}
