import dotenv from 'dotenv'
import { manager } from "../../managers/SongManager.js";
import * as iqf from "./inline_query_functions.js"
import { INLINE_TEXT_COMMANDS, INLINE_FILE_COMMANDS, INLINE_FILE_COMMANDS_KEYS, INLINE_TEXT_COMMANDS_KEYS } from "./inline_commands.js";
import { getMessages } from "../../mongodb/SongDB.js";
import { bot } from './bot.js'
import Song from "../../managers/entities/Song.js";
import loadEnv from '../../loadenv.js';
import startCommand from './commands/StartCommand.js';
import type CustomCommand from './commands/CustomCommand.js';
import { getCommandData } from '../../state/functions.js';
import roles from '../../roles/UserRoles.js';

loadEnv(dotenv)

/*

    CONFIG, COMMANDS AND SEARCH DATA

*/

const MAX_SEARCH_WORDS = 7;
const INLINE_PAGE_LIMIT = 4;

//----------------------------------

/*

    BOT DEFINITION

*/

const inlineQueryPagination: { [key: string]: string } = {}

async function start() {
    const webhookUrl = process.env.TELEGRAM_BOT_WEBHOOK_URL
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
        throw new Error('No telegram token')
    }

    if (process.env.NODE_ENV == 'development' || process.env.TELEGRAM_BOT_MODE?.toLowerCase() !== 'webhook' || !webhookUrl) {
        console.log('Telegram Bot: polling mode')
        bot.startPolling()
    } else {
        console.log('Telegram Bot: webhook mode')
        await bot.deleteWebHook()
        await bot.setWebHook(`${webhookUrl}/${token}`)
        bot.openWebHook()
    }
}

/*

    HELPERS

*/

function validForQ(text: string) {
    return text.replace(/[^а-яА-ЯїЇҐґЄєіІ̆\d' ̈]/g, '').replace('\'', '\\\'').slice(0, 100);
}

function parseQuery(query: string) {
    let words = query.split(' ')
    let songWords = []
    let fullText
    let textCommand = null
    let fileCommand = null

    for (let word of words) {
        let cmdname = INLINE_TEXT_COMMANDS_KEYS.find((c) => word.match(new RegExp(`^(${c})$`)))

        if (cmdname) {
            textCommand = INLINE_TEXT_COMMANDS[cmdname]
            continue
        }

        cmdname = INLINE_FILE_COMMANDS_KEYS.find((c) => word.match(new RegExp(`^(${c})$`)))

        if (cmdname) {
            fileCommand = INLINE_FILE_COMMANDS[cmdname]
            continue
        }

        songWords.push(word)
    }

    fullText = validForQ(songWords.slice(0, MAX_SEARCH_WORDS).join('  '))

    return { songWords, textCommand, fileCommand, fullText }
}



//----------------------------------------------------




/*

    WHEN USER SEND COMMANDS

*/

bot.on('message', async (message) => {
    if (!message || !message.from || message.chat.type !== 'private' || message.from.is_bot || !message.text) return;

    const userId = message.from.id.toString()
    let text = message.text.toLocaleLowerCase();

    if (startCommand.checkThis(text)) {
        startCommand.execute(bot, message)
        return;
    }

    let anyPlaceCommand: CustomCommand | null = null
    let textAfter = undefined

    for (let command of startCommand.anyPlaceCommands) {
        if (textAfter = command.checkThis(text)) {
            anyPlaceCommand = command
            break
        }
    }

    const role = roles.getUserRole(userId)

    if (!anyPlaceCommand && role) {
        const accessAnyPlaceCommands = startCommand.getAccessAnyplaceCommands(role)

        if (accessAnyPlaceCommands) {
            for (let command of accessAnyPlaceCommands) {
                if (textAfter = command.checkThis(text)) {
                    anyPlaceCommand = command
                    break
                }
            }
        }
    } else if (roles.isOwner(userId)) {
        for (let command of startCommand.ownerAnyplaceCommands) {
            if (textAfter = command.checkThis(text)) {
                anyPlaceCommand = command
                break
            }
        }
    }

    if (anyPlaceCommand) {
        anyPlaceCommand.execute(bot, message, typeof textAfter === 'string' ? textAfter : undefined)
        return
    }

    const userCommand = getCommandData(userId)

    if (!userCommand) {
        startCommand.onMessage(bot, message)
        return
    }

    userCommand.onMessage(bot, message)
})



/*

    WHEN USER USE @

*/

async function getInlineResults(songs: Song[], textCommand: InlineTextCommand | null, fileCommand: InlineFileCommand | null) {
    if (textCommand) {
        return songs.map(song => textCommand.func(song))
    }

    if (fileCommand) {
        const messages = await getMessages(fileCommand.name, songs)
        const results = songs.filter(song => {
            if (messages[song.id] === null) {
                console.log(`Warning! Song ${song.toString()} doesn't exist`)
                return false;
            }
            return true
        })
        return results.map(song => fileCommand.func(song, messages[song.id]?.fileId))
    }

    return songs.map(song => iqf.inlineDefaultResult(song))

}

bot.on('inline_query', async (iq) => {
    const query = iq.query;
    const queryId = iq.id;
    const offset = iq.offset

    const oldPagination = offset ? inlineQueryPagination[offset] : undefined

    const { textCommand, fileCommand, fullText } = parseQuery(query)
    const { songs, pagination } = await manager.getSongsByName({ name: fullText, limit: INLINE_PAGE_LIMIT, pagination: oldPagination })

    const options = pagination ? { cache_time: 0, next_offset: queryId } : { cache_time: 0 }

    delete inlineQueryPagination[offset]

    if (pagination) {
        inlineQueryPagination[queryId] = pagination;
    }

    const results = await getInlineResults(songs, textCommand, fileCommand)

    bot.answerInlineQuery(
        queryId,
        results,
        options
    )
})

export {
    start,
    bot
}