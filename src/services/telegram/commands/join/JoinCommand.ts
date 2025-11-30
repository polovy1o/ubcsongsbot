import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import type Song from "../../../../managers/entities/Song.js";
import { joinedSongsOfflineBufferFromContents, joinedSongsOnlineBufferFromContents } from "../../../../utils/pptx/pptx.js";
import { createPdfBufferFromMany } from "../../../../utils/pdf/pdf.js";
import { createDOCXBufferSongFromMany } from "../../../../utils/docx/docx.js";
import * as messages from "../../messages.js"
import { convertDateToString } from "../../../../utils/swissknife/swissknife.js";
import { getJoinData, updateJoinData } from "../../../../state/functions.js";
import { convertContentToProPresenter } from "../../../../utils/text/text.js";

const STATUS_ALREADY_EXCLUDED = 0
const STATUS_SUCCESSFULLY_EXCLUDED = 1
const STATUS_SONG_WAS_MODIFIED = 2

const STATUS_ALREADY_ADDED = 3;
const STATUS_SUCCESSFULLY_ADDED = 4
const STATUS_NOT_FOUND = 5

interface JoinTypeData {
    getBuffer: Function,
    sendDocument: Function,
    message: string
}

export class JoinCommand extends CustomCommand {
    joinTypes: { [key: string]: JoinTypeData };
    constructor(parent: CustomCommand) {
        super({
            pattern: "Об'єднати пісні|\/join",
            parent,
            anyPlace: false,
            onlyAction: false,
            keyboardText: 'Об\'єднати пісні',
            menu: []
        })
        this.joinTypes = {
            "Об'єднати пісні у online": {
                message: 'Почекайте, формуємо онлайн презентацію...',
                getBuffer: async (songs: Song[]) => {
                    const buffer = await joinedSongsOnlineBufferFromContents(songs.map(song => song.content))
                    return buffer
                },
                sendDocument: messages.sendSongOnline
            },
            "Об'єднати пісні у pdf": {
                message: 'Почекайте, формуємо pdf файл...',
                getBuffer: async (songs: Song[]) => {
                    const buffer = await createPdfBufferFromMany(songs.map(song => ({
                        title: song.name,
                        content: song.content
                    })))
                    return buffer
                },
                sendDocument: messages.sendSongPDF
            },
            
            "Об'єднати пісні у ProPresenter": {
                message: 'Почекайте, формуємо docx файл...',
                getBuffer: async (songs: Song[]) => {
                    const buffer = await createDOCXBufferSongFromMany(songs.map(song => ({
                        title: song.name,
                        content: convertContentToProPresenter(song.content)
                    })))
                    return buffer
                },
                sendDocument: messages.sendSongDOCX
            },
            "Об'єднати пісні у docx": {
                message: 'Почекайте, формуємо docx файл...',
                getBuffer: async (songs: Song[]) => {
                    const buffer = await createDOCXBufferSongFromMany(songs.map(song => ({
                        title: song.name,
                        content: song.content
                    })))
                    return buffer
                },
                sendDocument: messages.sendSongDOCX
            },
            "Об'єднати пісні у offline": {
                message: 'Почекайте, формуємо офлайн презентацію...',
                getBuffer: async (songs: Song[]) => {
                    const buffer = await joinedSongsOfflineBufferFromContents(songs.map(song => song.content))
                    return buffer
                },
                sendDocument: messages.sendSongOffline
            },
        }

        this.menu = ['Головне меню', ...Object.keys(this.joinTypes)]
        this.defaultKeyboard = this.menu.map(item => ([{ text: item }]))
    }

    async addData(userId: string, fullName: string) {
        const song: Song | null = await manager.getSongByName(fullName)

        if (!song) {
            return { status: STATUS_NOT_FOUND, songs: [], fullName }
        }

        const data = getJoinData(userId)

        let newData: string[] = []

        fullName = song.fullName.toLowerCase()

        let status = STATUS_SUCCESSFULLY_ADDED
        const songs = []

        if (data.length) {
            for (let listFullname of data) {
                listFullname = listFullname.toLowerCase()
                
                if (listFullname === fullName) {
                    status = STATUS_ALREADY_ADDED
                    continue
                }

                const song2 = await manager.getSongByName(listFullname)

                if (song2) {
                    newData.push(song2.fullName)
                    songs.push(song2)
                }
            }
        }

        newData.push(song.fullName)
        songs.push(song)

        updateJoinData(userId, newData)
        return { status, songs, fullName: song.fullName }
    }

    async deleteData(userId: string, fullName: string) {
        const data = getJoinData(userId)

        if (!data.length) {
            return { status: STATUS_ALREADY_EXCLUDED, songs: [] };
        }

        const newData = []
        const songs: Song[] = []
        let status = STATUS_ALREADY_EXCLUDED

        fullName = fullName.toLowerCase()

        for (let listFullname of data) {
            const song = await manager.getSongByName(listFullname)

            if (listFullname.toLowerCase() === fullName) {
                status = song ? STATUS_SUCCESSFULLY_EXCLUDED : STATUS_SONG_WAS_MODIFIED
                continue;
            }

            if (song) {
                newData.push(song.fullName)
                songs.push(song)
            }
        }

        updateJoinData(userId, newData)
        return { status, songs }
    }

    async updateData(userId: string) {
        const data = getJoinData(userId)

        if (!data.length) {
            return [];
        }

        const newData = []
        const songs = []

        for (let fullName of data) {
            const song = await manager.getSongByName(fullName)

            if (song) {
                newData.push(song.fullName)
                songs.push(song)
            }
        }

        updateJoinData(userId, newData)
        return songs
    }

    async sendSongsKeyboard(bot: TelegramBot, userId: string, data: Song[], message: string) {
        if (!data.length) {
            return this.sendKeyboard(bot, userId, 'Введіть назву пісні яку хочете додати для об\'єднання')
        }
        const keyboard: TelegramBot.KeyboardButton[][] = [
            ...(this.defaultKeyboard || []),
            ...data.map(item => ([{ text: `Вилучити "${item.fullName}"` }]))
        ]

        return bot.sendMessage(userId, message, {
            reply_markup: { keyboard, resize_keyboard: true },
            disable_web_page_preview: true,
        });
    }

    async execute(bot: TelegramBot, message: Message) {
        const userId = message.from?.id.toString() || message.chat.id.toString()
        const data = await this.updateData(userId)

        this.sendSongsKeyboard(bot, userId, data, 'Можете продовжувати додавати пісні по назві або:\n@ubcsongsbot запит name')
    }

    async onMessage(bot: TelegramBot, message: TelegramBot.Message) {
        if (!message.text) return;

        const userId = message.from?.id.toString() || message.chat.id.toString()
        const text = message.text.toLowerCase()

        const match = text.match(/вилучити \"(.*)\"/)

        if (match) {
            if (!match[1]) {
                bot.sendMessage(userId, 'Між дужками треба ввести назву пісні')
                return;
            }

            const { status, songs } = await this.deleteData(userId, match[1])

            if (status === STATUS_ALREADY_EXCLUDED) {
                bot.sendMessage(userId, `Пісні "${match[1]}" і так не було у списку`)
                return
            }

            if (status === STATUS_SONG_WAS_MODIFIED) {
                bot.sendMessage(userId, `Пісня "${match[1]}" була видалена/модіфікована`)
                return
            }

            await this.sendSongsKeyboard(bot, userId, songs, `Пісня "${match[1]}" була успішно вилучена зі списку`)
            return
        }

        if (this.joinTypes[message.text]) {
            const songs = await this.updateData(userId)
            if (!songs.length) {
                bot.sendMessage(userId, 'Нажаль, список пісень пустий')
                return
            }

            const { message: joinMessage, getBuffer, sendDocument } = this.joinTypes[message.text]

            await bot.sendMessage(userId, joinMessage)

            const buffer = await getBuffer(songs)

            const songDate = new Date()
            const day = songDate.getDay()

            if (day !== 0) {
                songDate.setDate(songDate.getDate() + (7 - day))
            }

            sendDocument({fullName: `Пісні на неділю ${convertDateToString(songDate)}`, buffer, userId})
            return
        }

        const { status, songs, fullName }  = await this.addData(userId, message.text)

        if (status === STATUS_NOT_FOUND) {
            await bot.sendMessage(userId, `Вибачте, не змогли знайти пісню по запиту ${message.text}`)
            return;
        }

        if (status === STATUS_ALREADY_ADDED) {
            await bot.sendMessage(userId, `Пісня по запиту "${message.text}" вже є у списку. Можливо спробуйте точніший запит`)
            return;
        }

        await this.sendSongsKeyboard(bot, userId, songs, `Ви успішно додали пісню "${fullName}"`)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}