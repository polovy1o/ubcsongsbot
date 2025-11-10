import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { manager } from "../../../../managers/SongManager.js";
import { getUserTextProperty, resetUserTextProperty, updateUserTextProperty } from "../../../../state/functions.js";
import startCommand from "../StartCommand.js";
import { keyboardDynamicKeys, keyboardDynamicMap } from "../../../notion/dynamic_map.js";

export class EditDynamicCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "редагувати динаміку пісні|\/editdynamic",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: 'Редагувати динаміку пісні'
        })
    }

    async checkCurrentSong(bot: TelegramBot, userId: string) {
        const songName = getUserTextProperty(userId, 'dynamic');

        if (songName) {
            const song = await manager.getSongByName(songName)

            if (!song) {
                await bot.sendMessage(userId, `Хтось видалив або перейменував пісню "${songName}" яку ви хотіли модифікувати`)
                resetUserTextProperty(userId, 'dynamic')
                startCommand.sendMenuKeyboard(bot, userId)
                return false;
            }

            return song
        }
    }

    async sendDefaultKeyboard(bot: TelegramBot, userId: string) {
        this.sendKeyboard(bot, userId, `
            Потрібна назва пісні в якій ви хочете ЗМІНИТИ ДИНАМІКУ
- Введіть назву пісні, і додасться пісня найближча по запиту
- Можна надіслати номер пісні (4 цифри)
- Можна знайти пісню: @ubcsongsbot Назва fname
        `)
    }

    async sendSongSavedKeyboard(bot: TelegramBot, userId: string, message?: string) {
        this.sendKeybordFromArray(
            bot,
            userId,
            ['Головне меню', ...keyboardDynamicKeys, 'Обрати іншу пісню для редагування', 'Видалити поточну динаміку пісні'],
            message || 'Виберіть іншу динаміку'
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
            resetUserTextProperty(userId, 'dynamic')
            this.sendDefaultKeyboard(bot, userId)
            return;
        }

        const savedSong = await this.checkCurrentSong(bot, userId)

        if (savedSong === false) {
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        if (text === 'видалити поточну динаміку пісні') {
            if (savedSong === undefined) {
                bot.sendMessage(userId, 'Спочатку введіть назву пісні')
                return
            }

            if (!savedSong.notion?.dynamic) {
                bot.sendMessage(userId, 'У пісні і так не вказана динаміка')
                return
            }

            await bot.sendMessage(userId, 'Почекайте, видаляю поточну динаміку пісні..')

            const result = await manager._updateNotionByCommands(savedSong, {dynamic: null});

            resetUserTextProperty(userId, 'dynamic')

            if (!result) {
                bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
                this.sendCurrentKeyboard(bot, userId)
                return;
            }

            bot.sendMessage(userId, `Динаміка пісні "${savedSong.fullName}" була видалена.`)
            startCommand.sendMenuKeyboard(bot, userId)

            return
        }

        if (savedSong === undefined) {
            const song = await manager.getSongByName(message.text)

            if (!song) {
                bot.sendMessage(userId, `Вибачте, по запиту "${message.text}" не знайшлось жодної пісні\nСпробуйте інший запит`)
                return;
            }

            updateUserTextProperty(userId, 'dynamic', song.fullName)

            const dynamic = song.notion?.dynamic
            const dynamicMessage = dynamic ? `Поточна динаміка: ${dynamic}` : 'У цій пісні не вказана динаміка'
            this.sendSongSavedKeyboard(bot, userId, `Була знайдена пісня "${song.fullName}".\n${dynamicMessage}\nТепер виберіть нову динаміку`)
            return;
        }

        if (!keyboardDynamicMap[text]) {
            bot.sendMessage(userId, 'Будь-ласка, оберіть динаміку пісні із списку нижче')
            return
        }

        await bot.sendMessage(userId, 'Почекайте, змінюю динаміку пісні..')

        const realDynamicName = keyboardDynamicMap[text].name

        const result = await manager._updateNotionByCommands(savedSong, {dynamic: realDynamicName});

        resetUserTextProperty(userId, 'dynamic')

        if (!result) {
            bot.sendMessage(userId, 'Сталася несподівана помилка.. спробуйте ще раз')
            this.sendCurrentKeyboard(bot, userId)
            return;
        }

        bot.sendMessage(userId, `Динаміка пісні "${savedSong.fullName}" була змінена на: ${realDynamicName}`)
        startCommand.sendMenuKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}