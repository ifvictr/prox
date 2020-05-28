const filterEvent = filterFn => {
    return async ({ event, next }) => {
        if (filterFn(event)) {
            await next()
        }
    }
}

export const channel = id => filterEvent(event => event.channel === id)

export const channelType = type => filterEvent(event => event.channel_type === type)

export const noBotMessages = filterEvent(event => !('subtype' in event) || event.subtype !== 'bot_message')

export const threaded = (shouldBeThreaded = true) => filterEvent(event => 'thread_ts' in event === shouldBeThreaded)
