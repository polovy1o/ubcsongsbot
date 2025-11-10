import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";
import { CREATE_SONG, manager } from "../../../../managers/SongManager.js";
import { getAddData, NEXT_STEP, nextStep, PREV_STEP, prevStep, resetAddDataWithCommand, SKIP_ALL, skipAll } from "../../../../state/functions.js";
import { keyboardDynamicKeys, keyboardDynamicMap } from "../../../notion/dynamic_map.js";
import { keyboardTempoKeys, keyboardTempoMap } from "../../../notion/tempo_map.js";
import { isExist } from "../../../google/google.js";

export const STEPS = {
    NAME: 0,
    CONTENT: 1,
    CHORDS: 2,
    TONALITY: 3,
    TEMPO: 4,
    DYNAMIC: 5
}

const ADDSONG_KEYBOARDS = [
    (data?: AddCommandData) => {
        if (data && data.stepsData && data.stepsData[STEPS.NAME]) {
            return {
                message: `1. Введіть іншу назву пісні якщо хочете змінити (зараз "${data.stepsData[STEPS.NAME]}")`,
                menu: [
                    'Головне меню',
                    'Залишити як було заповнено',
                ]
            }
        }

        return {
            message: '1. Введіть назву пісні',
            menu: ['Головне меню']
        }
    },
    (data?: AddCommandData) => {
        if (data && data.stepsData && data.stepsData[STEPS.CONTENT]) {
            return {
                message: '2. Відправте інші слова пісні якщо хочете змінити',
                menu: [
                    'Головне меню',
                    'Залишити як було заповнено',
                    'Попередній крок'
                ]
            }
        }

        return {
            message: '2. Відправте слова пісні',
            menu: ['Головне меню', 'Попередній крок']
        }
    },
    (data?: AddCommandData) => {
        if (data && data.stepsData && data.stepsData[STEPS.CHORDS]) {
            return {
                message: `3. Відправте інше посилання на акорди (зараз "${data.stepsData[STEPS.CHORDS]}")`,
                menu: [
                    'Головне меню',
                    'Залишити як було заповнено',
                    'Залишити пустим',
                    'Пропустити всі кроки',
                    'Попередній крок'
                ]
            }
        }

        return {
            message: '3. Відправте посилання на акорди',
            menu: [
                'Головне меню',
                'Залишити пустим',
                'Пропустити всі кроки',
                'Попередній крок'
            ]
        }
    },
    (data?: AddCommandData) => {
        if (data && data.stepsData && data.stepsData[STEPS.TONALITY]) {
            return {
                message: `4. Тональність пісні (зараз "${data.stepsData[STEPS.TONALITY]}")`,
                menu: [
                    'Головне меню',
                    'Залишити як було заповнено',
                    'Залишити пустим',
                    'Пропустити всі кроки',
                    'Попередній крок'
                ]
            }
        }

        return {
            message: '4. Тональність пісні',
            menu: [
                'Головне меню',
                'Залишити пустим',
                'Пропустити всі кроки',
                'Попередній крок'
            ]
        }
    },
    (data?: AddCommandData) => {
        if (data && data.stepsData && data.stepsData[STEPS.TEMPO]) {
            return {
                message: `5. Оберіть інший темп пісні (зараз "${data.stepsData[STEPS.TEMPO]}")`,
                menu: [
                    'Головне меню',
                    ...keyboardTempoKeys,
                    'Залишити як було заповнено',
                    'Залишити пустим',
                    'Пропустити всі кроки',
                    'Попередній крок'
                ]
            }
        }

        return {
            message: '5. Оберіть темп пісні',
            menu: [
                'Головне меню',
                ...keyboardTempoKeys,
                'Залишити пустим',
                'Пропустити всі кроки',
                'Попередній крок'
            ]
        }
    },
    (data?: AddCommandData) => {
        if (data && data.stepsData && data.stepsData[STEPS.DYNAMIC] !== undefined) {
            const dynamic = data.stepsData[STEPS.DYNAMIC]
            const dynamicText = dynamic ? `"${dynamic}"` : 'не вказано'
            return {
                message: `6. Оберіть іншу динаміку пісні (зараз ${dynamicText})`,
                menu: [
                    'Головне меню',
                    ...keyboardDynamicKeys,
                    'Залишити як було заповнено',
                    'Залишити пустим',
                    'Пропустити всі кроки',
                    'Попередній крок',
                ]
            }
        }

        return {
            message: '6. Оберіть динаміку пісні',
            menu: [
                'Головне меню',
                    ...keyboardDynamicKeys,
                'Залишити пустим',
                'Пропустити всі кроки',
                'Попередній крок'
            ]
        }
    },
    (data?: AddCommandData) => {
        return {
            message: `Впевнені що хочете створити пісню?`,
            menu: [
                'Головне меню',
                'Створити пісню',
                'Попередній крок'
            ]
        }
    },
]


export class AddCommand extends CustomCommand {
    constructor(parent: CustomCommand) {
        super({
            pattern: "додати пісню|\/add",
            parent,
            anyPlace: false,
            onlyAction: false,
            menu: [],
            rolesAccess: ['tech', 'worship'],
            keyboardText: 'Додати пісню'
        })
    }

    async sendCurrentKeyboard(bot: TelegramBot, userId: string) {
        const data = getAddData(userId)
        const step = data?.currentStep || 0

        const { message, menu } = ADDSONG_KEYBOARDS[step](data)

        this.sendKeybordFromArray(
            bot,
            userId,
            menu,
            message
        )
    }

    async execute(bot: TelegramBot, message: Message) {
        const userId = message.from?.id.toString() || message.chat.id.toString()
        this.sendCurrentKeyboard(bot, userId)
    }

    async onMessage(bot: TelegramBot, message: TelegramBot.Message) {
        if (!message.text) return;

        const userId = message.from?.id.toString() || message.chat.id.toString()
        const text = message.text.toLowerCase()

        /*
            Залишити як було заповнено
            Попередній крок
            Залишити пустим
            Пропустити всі кроки
            (tempo)
            (dynamic)
        */

        const data = getAddData(userId)

        if (text === 'залишити як було заповнено') {
            const status = nextStep(userId)

            if (status === NEXT_STEP.EMPTY_CONTENT) {
                bot.sendMessage(userId, 'Ви не відправляли слова пісні до цього')
                return
            }

            if (status === NEXT_STEP.EMPTY_NAME) {
                bot.sendMessage(userId, 'Ви не відправляли назву пісні до цього')
                return
            }

            this.sendCurrentKeyboard(bot, userId)
            return
        } else if (text === 'попередній крок') {
            const status = prevStep(userId)

            if (status === PREV_STEP.MIN) {
                bot.sendMessage(userId, 'Попереднього кроку немає')
                return;
            }

            this.sendCurrentKeyboard(bot, userId)
            return
        } else if (text === 'залишити пустим') {
            const status = nextStep(userId, null)

            if (status === NEXT_STEP.EMPTY_CONTENT) {
                bot.sendMessage(userId, 'Слова пісні обов\'язково потрібні')
                return
            }

            if (status === NEXT_STEP.EMPTY_NAME) {
                bot.sendMessage(userId, 'Назва пісні обов\'язково потрібні')
                return
            }

            this.sendCurrentKeyboard(bot, userId)
            return
        } else if (text === 'пропустити всі кроки') {
            const status = skipAll(userId)

            if (status === SKIP_ALL.CANT_SKIP) {
                bot.sendMessage(userId, 'Ви не можете пропустити цей крок')
                return
            }

            if (status === SKIP_ALL.ALREADY_LAST) {
                bot.sendMessage(userId, 'Ви вже на останньому кроку')
                return
            }

            this.sendCurrentKeyboard(bot, userId)
            return
        } else if (text === 'створити пісню') {
            if (data?.currentStep !== STEPS.DYNAMIC + 1) {
                bot.sendMessage(userId, 'Ви ще не на останньому кроці')
                return
            }

            await bot.sendMessage(userId, 'Почекайте, створюємо пісню, це може бути надовго...')

            const result = await manager.createSongFromAddCommand(data.stepsData)

            if (typeof result === 'number') {
                if (result === CREATE_SONG.NO_DATA) {
                    bot.sendMessage(userId, 'Несподівана помилка, введені дані пісні відсутні! Напішіть розробнику')
                } else if (result === CREATE_SONG.ALREADY_EXISTS) {
                    bot.sendMessage(userId, 'Вже встигли створити пісню з такою назвою!')
                }
                return
            }

            let text = `Ви успішно створили пісню "${result.fullName}"\n` +
                `Google диск: https://docs.google.com/document/d/${result.id}`;

            if (result.notion?.url) {
                text += `\nNotion: ${result.notion?.url}`
            }

            resetAddDataWithCommand(userId)

            this.parent?.sendKeyboard(bot, userId, text)
            return;
        }

        if (!data?.currentStep) {
            if (await isExist(text)) {
                bot.sendMessage(userId, `Пісня з назвою "${message.text}" вже існує`)
                return
            }

            nextStep(userId, message.text)

            this.sendCurrentKeyboard(bot, userId)
            return
        }

        if (data.currentStep === STEPS.TEMPO) {
            if (!keyboardTempoMap[text]) {
                bot.sendMessage(userId, `Оберіть темп із списку нижче`)
                return
            }

            nextStep(userId, keyboardTempoMap[text].name)

            this.sendCurrentKeyboard(bot, userId)
            return
        }

        if (data.currentStep === STEPS.DYNAMIC) {
            if (!keyboardDynamicMap[text]) {
                bot.sendMessage(userId, `Оберіть динаміку із списку нижче`)
                return
            }

            nextStep(userId, keyboardDynamicMap[text].name)
            
            this.sendCurrentKeyboard(bot, userId)
            return
        }

        if (data.currentStep === STEPS.DYNAMIC + 1) {
            return;
        }

        nextStep(userId, message.text)
        this.sendCurrentKeyboard(bot, userId)
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return [[{ text: 'Головне меню' }]]
    }
}