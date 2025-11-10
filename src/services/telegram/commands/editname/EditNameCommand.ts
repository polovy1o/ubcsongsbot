import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import { getUserTextProperty, resetUserTextProperty, updateUserTextProperty } from "../../../../state/functions.js";
import startCommand from "../StartCommand.js";


export class EditNameCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "редагувати назву пісні|\/editname",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: "Редагувати назву пісні"
        })
    }

    async checkCurrentSong(bot: TelegramBot, userId: string) {
        const songName = getUserTextProperty(userId, 'name');

        if (songName) {
            const song = await manager.getSongByName(songName)

            if (!song) {
                await bot.sendMessage(userId, `Хтось видалив або перейменував пісню "${songName}" яку ви хотіли модифікувати`)
                resetUserTextProperty(userId, 'name')
                startCommand.sendMenuKeyboard(bot, userId)
                return false;
            }

            return song
        }
    }

    async sendDefaultKeyboard(bot: TelegramBot, userId: string) {
        this.sendKeyboard(bot, userId, `
            Потрібна назва пісні в якій ви хочете ЗМІНИТИ НАЗВУ
- Введіть назву пісні, і додасться пісня найближча по запиту
- Можна надіслати номер пісні (4 цифри)
- Можна знайти пісню: @ubcsongsbot Назва fname
        `)
    }

    async sendSongSavedKeyboard(bot: TelegramBot, userId: string, message?: string) {
        this.sendKeybordFromArray(
            bot, 
            userId, 
            ['Обрати іншу пісню для редагування', 'Головне меню'],
            message || 'Введіть нові слова'
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
            resetUserTextProperty(userId, 'name')
            this.sendDefaultKeyboard(bot, userId)
            return;
        }

        const savedSong = await this.checkCurrentSong(bot, userId)

        if (savedSong === false) {
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        if (savedSong === undefined) {
            const song = await manager.getSongByName(message.text)
            
            if (!song) {
                bot.sendMessage(userId, `Вибачте, по запиту "${message.text}" не знайшлось жодної пісні\nСпробуйте інший запит`)
                return;
            }

            updateUserTextProperty(userId, 'name', song.fullName)
            this.sendSongSavedKeyboard(bot, userId, `Була знайдена пісня "${song.fullName}". Тепер введіть нову назву пісні БЕЗ НОМЕРУ`)
            return;
        }

        await bot.sendMessage(userId, 'Почекайте, змінюю назву пісні..')

        const oldFullName = savedSong.fullName

        const result = await manager._renameSong(savedSong, message.text);

        resetUserTextProperty(userId, 'name')

        if (!result) {
            bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
            this.sendCurrentKeyboard(bot, userId)
            return;
        }
        
        bot.sendMessage(userId, `Назва пісні "${oldFullName}" була змінена на "${savedSong.fullName}"`)
        
        startCommand.sendMenuKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}