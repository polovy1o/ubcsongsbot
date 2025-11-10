import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import { getUserTextProperty, resetUserTextProperty, updateUserTextProperty } from "../../../../state/functions.js";
import { createDOCXBufferSong } from "../../../../utils/docx/docx.js";
import { sendSongDOCX } from "../../messages.js";
import startCommand from "../StartCommand.js";


export class EditContentCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "редагувати слова пісні|\/editcontent",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: 'Редагувати слова пісні'
        })
    }

    async checkCurrentSong(bot: TelegramBot, userId: string) {
        const songName = getUserTextProperty(userId, 'content');

        if (songName) {
            const song = await manager.getSongByName(songName)

            if (!song) {
                await bot.sendMessage(userId, `Хтось видалив пісню "${songName}" яку ви хотіли модифікувати`)
                resetUserTextProperty(userId, 'content')
                startCommand.sendMenuKeyboard(bot, userId)
                return false;
            }

            return song
        }
    }

    async sendDefaultKeyboard(bot: TelegramBot, userId: string) {
        this.sendKeyboard(bot, userId, `
            Потрібна назва пісні в якій ви хочете змінити слова
- Введіть назву пісні, і додасться пісня найближча по запиту
- Можна надіслати номер пісні (4 цифри)
- Можна знайти пісню: @ubcsongsbot Назва fname
        `)
    }

    async sendSongSavedKeyboard(bot: TelegramBot, userId: string, message?: string) {
        this.sendKeybordFromArray(
            bot, 
            userId, 
            ['Обрати іншу пісню для редагування', 'Отримати поточні слова пісні', 'Головне меню'],
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
            resetUserTextProperty(userId, 'content')
            this.sendDefaultKeyboard(bot, userId)
            return;
        }

        if (text === 'отримати поточні слова пісні') {
            const song = await this.checkCurrentSong(bot, userId)

            if (song) {
                bot.sendMessage(userId, song.content)
                return;
            }

            this.sendCurrentKeyboard(bot, userId)
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

            updateUserTextProperty(userId, 'content', song.fullName)
            this.sendSongSavedKeyboard(bot, userId, `Була знайдена пісня "${song.fullName}". Тепер введіть нові слова для цієї пісні`)
            return;
        }

        await bot.sendMessage(userId, 'Почекайте, зараз надішлю старі слова пісні і зміню на нові...')

        const buffer = await createDOCXBufferSong(savedSong.fullName, savedSong.content)

        await sendSongDOCX({ fullName: savedSong.fullName, buffer, userId })

        const result = await manager._updateSongContent(savedSong, message.text);

        resetUserTextProperty(userId, 'content')

        if (!result) {
            bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
            this.sendCurrentKeyboard(bot, userId)
            return;
        }
        
        bot.sendMessage(userId, `Слова пісні "${savedSong.fullName}" були змінені`)
        startCommand.sendMenuKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}