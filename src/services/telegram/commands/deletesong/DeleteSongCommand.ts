import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import { getUserTextProperty, resetUserTextProperty, updateUserTextProperty } from "../../../../state/functions.js";
import startCommand from "../StartCommand.js";

export class DeleteSongCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "видалити пісню|\/deletesong",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: 'Видалити пісню'
        })
    }

    async checkCurrentSong(bot: TelegramBot, userId: string) {
        const songName = getUserTextProperty(userId, 'delete');

        if (songName) {
            const song = await manager.getSongByName(songName)

            if (!song) {
                await bot.sendMessage(userId, `Хтось вже видалив або перейменував пісню "${songName}"`)
                resetUserTextProperty(userId, 'delete')
                startCommand.sendMenuKeyboard(bot, userId)
                return false;
            }

            return song
        }
    }

    async sendDefaultKeyboard(bot: TelegramBot, userId: string) {
        this.sendKeyboard(bot, userId, `
            Потрібна назва пісні яку ви хочете ВИДАЛИТИ
- Введіть назву пісні, і додасться пісня найближча по запиту
- Можна надіслати номер пісні (4 цифри)
- Можна знайти пісню: @ubcsongsbot Назва fname
        `)
    }

    async sendSongSavedKeyboard(bot: TelegramBot, userId: string, message?: string) {
        this.sendKeybordFromArray(
            bot,
            userId,
            ['Так', 'Обрати іншу пісню для видалення', 'Головне меню'],
            message || 'Ви впевнені що хочете видалити пісню?'
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

        if (text === 'обрати іншу пісню для видалення') {
            resetUserTextProperty(userId, 'delete')
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

            updateUserTextProperty(userId, 'delete', song.fullName)
            this.sendSongSavedKeyboard(bot, userId, `Була знайдена пісня "${song.fullName}". Ви впевнені що хочете видалити цю пісню?`)
            return;
        }

        if (text !== 'так') {
            return
        }

        await bot.sendMessage(userId, 'Почекайте, видаляю пісню..')

        const oldFullName = savedSong.fullName

        const result = await manager._deleteSong(savedSong);

        resetUserTextProperty(userId, 'delete')

        if (!result) {
            bot.sendMessage(userId, `УВАГА! Пісня була видалена лише з Notion, телеграму та БД.\nЦю пісню на диску створював не бот, тому він не може її видалити з диску. Спробуйте видалити вручну, або попросіть власника видалити: ${savedSong.getGoogleLink()}`)
        } else {
            bot.sendMessage(userId, `Пісня "${oldFullName}" була видалена з гугл диску, notion та бази даних`)
        }

        startCommand.sendMenuKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}