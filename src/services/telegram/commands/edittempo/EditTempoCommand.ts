import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import { getUserTextProperty, resetUserTextProperty, updateUserTextProperty } from "../../../../state/functions.js";
import startCommand from "../StartCommand.js";
import { keyboardTempoKeys, keyboardTempoMap } from "../../../notion/tempo_map.js";


export class EditTempoCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "редагувати темп пісні|\/edittempo",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: "Редагувати темп пісні"
        })
    }

    async checkCurrentSong(bot: TelegramBot, userId: string) {
        const songName = getUserTextProperty(userId, 'tempo');

        if (songName) {
            const song = await manager.getSongByName(songName)

            if (!song) {
                await bot.sendMessage(userId, `Хтось видалив або перейменував пісню "${songName}" яку ви хотіли модифікувати`)
                resetUserTextProperty(userId, 'tempo')
                startCommand.sendMenuKeyboard(bot, userId)
                return false;
            }

            return song
        }
    }

    async sendDefaultKeyboard(bot: TelegramBot, userId: string) {
        this.sendKeyboard(bot, userId, `
            Потрібна назва пісні в якій ви хочете ЗМІНИТИ ТЕМП
- Введіть назву пісні, і додасться пісня найближча по запиту
- Можна надіслати номер пісні (4 цифри)
- Можна знайти пісню: @ubcsongsbot Назва fname
        `)
    }

    async sendSongSavedKeyboard(bot: TelegramBot, userId: string, message?: string) {
        this.sendKeybordFromArray(
            bot,
            userId,
            ['Головне меню', ...keyboardTempoKeys, 'Обрати іншу пісню для редагування', 'Видалити поточний темп пісні'],
            message || 'Виберіть інший темп'
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
            resetUserTextProperty(userId, 'tempo')
            this.sendDefaultKeyboard(bot, userId)
            return;
        }

        const savedSong = await this.checkCurrentSong(bot, userId)

        if (savedSong === false) {
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        if (text === 'видалити поточний темп пісні') {
            if (savedSong === undefined) {
                bot.sendMessage(userId, 'Спочатку введіть назву пісні')
                return
            }

            if (!savedSong.notion?.tempo) {
                bot.sendMessage(userId, 'У пісні і так не вказаний темп')
                return
            }

            await bot.sendMessage(userId, 'Почекайте, видаляю поточний темп пісні..')

            const result = await manager._updateNotionByCommands(savedSong, {tempo: null});

            resetUserTextProperty(userId, 'tempo')

            if (!result) {
                bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
                this.sendCurrentKeyboard(bot, userId)
                return;
            }

            bot.sendMessage(userId, `Темп пісні "${savedSong.fullName}" був видалений.`)
            startCommand.sendMenuKeyboard(bot, userId)

            return
        }

        if (savedSong === undefined) {
            const song = await manager.getSongByName(message.text)

            if (!song) {
                bot.sendMessage(userId, `Вибачте, по запиту "${message.text}" не знайшлось жодної пісні\nСпробуйте інший запит`)
                return;
            }

            updateUserTextProperty(userId, 'tempo', song.fullName)

            const tempo = song.notion?.tempo
            const tempoMessage = tempo ? `Поточний темп: ${tempo}` : 'У цій пісні не вказаний темп'
            this.sendSongSavedKeyboard(bot, userId, `Була знайдена пісня "${song.fullName}".\n${tempoMessage}\nТепер виберіть новий темп`)
            return;
        }

        if (!keyboardTempoMap[text]) {
            bot.sendMessage(userId, 'Будь-ласка, оберіть темп пісні із списку нижче')
            return
        }

        await bot.sendMessage(userId, 'Почекайте, змінюю темп пісні..')

        const realTempoName = keyboardTempoMap[text].name

        const result = await manager._updateNotionByCommands(savedSong, {tempo: realTempoName});

        resetUserTextProperty(userId, 'tempo')

        if (!result) {
            bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        bot.sendMessage(userId, `Темп пісні "${savedSong.fullName}" був змінений на: ${realTempoName}`)
        startCommand.sendMenuKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}