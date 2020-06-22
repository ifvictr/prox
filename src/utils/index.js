import crypto from 'crypto'
import { URL } from 'url'
import adjectives from '../data/adjectives.json'
import animals from '../data/animals.json'
import icons from '../data/icons.json'

export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1)

export const generatePseudonymSet = () => ({
    adjective: pickRandom(adjectives),
    noun: pickRandom(animals)
})

export const getIcon = noun => icons[noun] ? `:${icons[noun]}:` : null

export const getIdFromUrl = inputUrl => {
    const url = new URL(inputUrl)
    const lastSegment = url.pathname.slice(url.pathname.lastIndexOf('/') + 1)

    // Attempt to find ID in the URL. Format: pXXXXXXXXXXXXXXXX
    if (!lastSegment.startsWith('p') && lastSegment.length !== 17) {
        return null
    }

    const id = lastSegment.slice(1) // XXXXXXXXXXXXXXXX
    const insertPos = id.length - 6
    // NOTE: Slack's web API is picky about the period. Now formatted as XXXXXXXXXX.XXXXXX
    const formattedId = id.slice(0, insertPos) + '.' + id.slice(insertPos)
    return formattedId
}

export const hash = (value, salt) => crypto.createHash('sha256')
    .update(value)
    .update(salt).digest('hex').toString()

export const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)]

// Inserts zero-width non-joiner to prevent special tags like "@everyone" and "<!channel|channel>" from working
export const removeSpecialTags = str => str
    .replace(/@(channel|everyone|here)/ig, '@\u200c$1')
    .replace(/\<\!(channel|everyone|here)\|(.*?)\>/ig, '<\u200c!$1|$2>')
