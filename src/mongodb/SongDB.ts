import * as messages from "../services/telegram/messages.js";
import { createDOCXBufferSong } from "../utils/docx/docx.js";
import { createPdfBuffer } from "../utils/pdf/pdf.js";
import { getOfflinePPTXBuffer, getOnlinePPTXBuffer } from "../utils/pptx/pptx.js";
import Song from "../managers/entities/Song.js";
import SongModel from "./models/SongModel.js";

const SENT_DOCS_TO_TIMEOUT = 20;
const MAX_SENT_DOCS_FOR_SONG = 4;
const TIMEOUT_SECONDS = 50;

const loadOptions: MessagesLoadOptions = {
    docx: {
        buff: {
            func: createDOCXBufferSong,
            songArgs: ['name', 'content']
        },
        sendFunc: messages.sendSongDOCX.bind(messages)
    },
    pdf: {
        buff: {
            func: createPdfBuffer,
            songArgs: ['name', 'content']
        },
        sendFunc: messages.sendSongPDF.bind(messages)
    },
    online: {
        buff: {
            func: getOnlinePPTXBuffer,
            songArgs: ['content']
        },
        sendFunc: messages.sendSongOnline.bind(messages)
    },
    offline: {
        buff: {
            func: getOfflinePPTXBuffer,
            songArgs: ['content']
        },
        sendFunc: messages.sendSongOffline.bind(messages)
    },
}

function timeout() {
    return new Promise(resolve => setTimeout(resolve, 1000 * TIMEOUT_SECONDS));
}

function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
}

async function createSong(song: Song) {
    const createData: ISong = { song_id: song.id }
    const messages: TelegramSongMessages = {}

    for (let [docType, { buff, sendFunc }] of typedEntries(loadOptions)) {
        const buffFuncArgs = buff.songArgs.map(arg => song.get(arg))
        const buffer = await buff.func(...buffFuncArgs)

        messages[docType] = await sendFunc({ fullName: song.fullName, buffer, modifiedTime: song.modifiedTime })
    }

    createData.messages = messages

    await SongModel.create(createData)
    return createData
}

async function loadSongs(songs: Song[]) {
    let sentCount = 0

    for (let song of songs) {
        sentCount += await loadSong(song)

        if (sentCount + MAX_SENT_DOCS_FOR_SONG > SENT_DOCS_TO_TIMEOUT) {
            sentCount = 0;
            await timeout()
        }
    }
}

async function loadSongsByType(songs: Song[], type: keyof TelegramSongMessages) {
    let sentCount = 0

    for (let song of songs) {
        sentCount += await loadSongByType(song, type)

        if (sentCount > SENT_DOCS_TO_TIMEOUT) {
            sentCount = 0;
            await timeout()
        }
    }
}

async function loadSongByType(song: Song, type: keyof TelegramSongMessages) {
    let message: any = (await SongModel.findOne({ song_id: song.id }))?.messages

    const { fullName, content, modifiedTime } = song

    if (!message) {
        const createData: any = { song_id: song.id, messages: {} }
        const { buff, sendFunc } = loadOptions[type]

        const buffFuncArgs = buff.songArgs.map(arg => song.get(arg))
        const buffer = await buff.func(...buffFuncArgs)

        createData.messages[type] = await sendFunc({ fullName, buffer, modifiedTime })

        await SongModel.create(createData)
        return 1;
    }

    if (!message[type]?.fileId || (message[type].modifiedTime < modifiedTime)) {
        const oldId = message[type].id
        let sendCount = 0
        const updateData: any = { messages: { ...message } }
        const { buff, sendFunc } = loadOptions[type]

        const buffFuncArgs = buff.songArgs.map(arg => song.get(arg))
        const buffer = await buff.func(...buffFuncArgs)

        updateData.messages[type] = await sendFunc({ fullName, buffer, modifiedTime })

        sendCount++

        await SongModel.updateOne({ song_id: song.id }, updateData)
        await messages.deleteMessage(oldId)

        return 1
    }

    return 0
}

async function loadSong(song: Song) {
    let message: any = (await SongModel.findOne({ song_id: song.id }))?.messages

    const { fullName, content, modifiedTime } = song

    if (!message) {
        const createData: any = { song_id: song.id, messages: {} }

        for (let [docType, { buff, sendFunc }] of Object.entries(loadOptions)) {
            const buffFuncArgs = buff.songArgs.map(arg => song.get(arg))
            const buffer = await buff.func(...buffFuncArgs)

            createData.messages[docType] = await sendFunc({ fullName, buffer, modifiedTime })
        }

        await SongModel.create(createData)

        return 4;
    }

    let sendCount = 0
    const updateData: any = { messages: { ...message } }

    for (let [docType, { buff, sendFunc }] of Object.entries(loadOptions)) {
        if (!message[docType]?.fileId || (message[docType]?.modifiedTime || 0) < modifiedTime) {
            const oldId = message[docType].id
            const buffFuncArgs = buff.songArgs.map(arg => song.get(arg))
            const buffer = await buff.func(...buffFuncArgs)

            updateData.messages[docType] = await sendFunc({ fullName, buffer, modifiedTime })

            await messages.deleteMessage(oldId)
            sendCount++
        }
    }

    if (sendCount > 0) {
        await SongModel.updateOne({ song_id: song.id }, updateData)
    }

    return sendCount
}

async function getMessages(type: keyof TelegramSongMessages, songs: Song[]) {
    await loadSongsByType(songs, type)

    const ids = songs.map(song => song.id)
    const messages = await SongModel.find({ song_id: { $in: ids } })
    const foundedIds = Object.fromEntries(messages.map(msg => (
        [msg.song_id, msg.messages ? msg.messages[type] : null]
    )))

    return foundedIds
}

async function deleteDBMessages(song: Song) {
    const res = await SongModel.findOneAndDelete({ song_id: song.id })
    return res?.messages
}

export {
    loadSongs,
    getMessages,
    createSong,
    loadSong,
    loadSongByType,
    loadSongsByType,
    deleteDBMessages
}