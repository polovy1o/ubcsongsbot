import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import { getUserTextProperty, resetUserTextProperty, updateUserTextProperty } from "../../../../state/functions.js";
import startCommand from "../StartCommand.js";


export class EditChordsCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "редагувати акорди пісні|\/editchords",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: 'Редагувати акорди пісні'
        })
    }

    async checkCurrentSong(bot: TelegramBot, userId: string) {
        const songName = getUserTextProperty(userId, 'chords');

        if (songName) {
            const song = await manager.getSongByName(songName)

            if (!song) {
                await bot.sendMessage(userId, `Хтось видалив або перейменував пісню "${songName}" яку ви хотіли модифікувати`)
                resetUserTextProperty(userId, 'chords')
                startCommand.sendMenuKeyboard(bot, userId)
                return false;
            }

            return song
        }
    }

    async sendDefaultKeyboard(bot: TelegramBot, userId: string) {
        this.sendKeyboard(bot, userId, `
            Потрібна назва пісні в якій ви хочете ЗМІНИТИ АКОРДИ
- Введіть назву пісні, і додасться пісня найближча по запиту
- Можна надіслати номер пісні (4 цифри)
- Можна знайти пісню: @ubcsongsbot Назва fname
        `)
    }

    async sendSongSavedKeyboard(bot: TelegramBot, userId: string, message?: string) {
        this.sendKeybordFromArray(
            bot,
            userId,
            ['Обрати іншу пісню для редагування', 'Видалити поточне посилання на акорди', 'Головне меню'],
            message || 'Введіть нові акорди'
        )
    }

    async sendCurrentKeyboard(bot: TelegramBot, userId: string) {
        const song = await this.checkCurrentSong(bot, userId)

        if (song) {
            this.sendSongSavedKeyboard(bot, userId)
            return;
        }

        this.sendDefaultKeyboard(bot, userId)
    }

    async execute(bot: TelegramBot, message: Message) {
        const userId = message.from?.id.toString() || message.chat.id.toString()
        this.sendCurrentKeyboard(bot, userId)
    }

    async onMessage(bot: TelegramBot, message: TelegramBot.Message) {
        if (!message.text) return;

        const userId = message.from?.id.toString() || message.chat.id.toString()
        const text = message.text.toLowerCase()

        if (text === 'обрати іншу пісню для редагування') {
            resetUserTextProperty(userId, 'chords')
            this.sendDefaultKeyboard(bot, userId)
            return;
        }

        const savedSong = await this.checkCurrentSong(bot, userId)

        if (savedSong === false) {
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        if (text === 'видалити поточне посилання на акорди') {
            if (savedSong === undefined) {
                bot.sendMessage(userId, 'Спочатку введіть назву пісні')
                return
            }

            await bot.sendMessage(userId, 'Почекайте, видаляю поточне посилання пісні на акорди..')

            const result = await manager._updateNotionByCommands(savedSong, {chords: null});

            resetUserTextProperty(userId, 'chords')

            if (!result) {
                bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
                this.sendCurrentKeyboard(bot, userId)
                return;
            }

            bot.sendMessage(userId, `Посилання на акорди пісні "${savedSong.fullName}" було видалено.`)
            startCommand.sendMenuKeyboard(bot, userId)

            return
        }

        if (savedSong === undefined) {
            const song = await manager.getSongByName(message.text)

            if (!song) {
                bot.sendMessage(userId, `Вибачте, по запиту "${message.text}" не знайшлось жодної пісні\nСпробуйте інший запит`)
                return;
            }

            updateUserTextProperty(userId, 'chords', song.fullName)

            const chordsUrl = song.notion?.chords
            const chordsMessage = chordsUrl ? `Поточне посилання на акорди: ${chordsUrl}` : 'У цій пісні нема посилання на акорди'
            this.sendSongSavedKeyboard(bot, userId, `Була знайдена пісня "${song.fullName}".\n${chordsMessage}\nТепер введіть нове посилання на акорди`)
            return;
        }

        await bot.sendMessage(userId, 'Почекайте, змінюю акорди пісні..')

        const result = await manager._updateNotionByCommands(savedSong, {chords: message.text});

        resetUserTextProperty(userId, 'chords')

        if (!result) {
            bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        bot.sendMessage(userId, `Посилання на акорди пісні "${savedSong.fullName}" було змінено на: ${message.text}`)
        startCommand.sendMenuKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}