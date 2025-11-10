import type { KeyboardButton, Message } from "node-telegram-bot-api";
import type TelegramBot from "node-telegram-bot-api";
import type { normalizeWithoutMarks } from "../../../utils/text/text";

interface CommandParams {
    keyboardText?: string
    parent?: CustomCommand | undefined,
    subcommands?: CustomCommand[]
    pattern: string,
    owner?: boolean | undefined,
    rolesAccess?: string[] | undefined
    isEquals?: boolean | undefined,
    menu?: string[] | undefined | null,
    anyPlace: boolean,
    onlyAction: boolean
}

export default abstract class CustomCommand {
    pattern: string;
    keyboardText?: string;
    owner: boolean | undefined;
    rolesAccess?: string[] | undefined
    isEquals: boolean | undefined
    subcommands: CustomCommand[] | undefined
    parent: CustomCommand | undefined
    menu: string[] | undefined | null
    anyPlace: boolean
    onlyAction: boolean

    defaultKeyboard: KeyboardButton[][] | undefined | null

    constructor({ rolesAccess, onlyAction, keyboardText, parent, subcommands, pattern, owner, isEquals, menu, anyPlace }: CommandParams) {
        this.pattern = pattern.toLowerCase().trim()
        this.owner = owner
        this.rolesAccess = rolesAccess
        this.isEquals = isEquals
        this.keyboardText = keyboardText,
        this.parent = parent
        this.subcommands = subcommands
        this.menu = menu
        this.anyPlace = anyPlace
        this.onlyAction = onlyAction

        if (this.menu) {
            this.defaultKeyboard = this.menu.map(item => ([{ text: item }]))
        } else {
            this.defaultKeyboard = this.menu
        }
    }

    checkSubcommands(bot: TelegramBot, message: Message): CustomCommand | null | undefined {
        const text = message.text?.toLowerCase()

        if (!this.subcommands || !this.subcommands.length || !text) {
            return null
        }

        for (let subcommand of this.subcommands) {
            const check = subcommand.checkThis(text)
            if (check) {
                if (typeof check === 'string') {
                    subcommand.execute(bot, message, check)
                } else {
                    subcommand.execute(bot, message)
                }
                return subcommand;
            }
        }
        return null
    }

    checkThis(text: string): boolean | string {
        text = text.toLowerCase().trim()

        if (this.isEquals) {
            const re = new RegExp(`^${this.pattern}$`)
            return re.test(text)
        }

        const re = new RegExp(`^${this.pattern}(.*)$`)
        const match = text.match(re)

        if (!match) {
            return false
        }

        if (match[1]) {
            return match[1][0] === ' ' ? match[1].trim() : false
        }

        return true
    }

    abstract execute(bot: TelegramBot, message: Message, textAfter?: string | undefined): any;
    abstract onMessage(bot: TelegramBot, message: Message): any;
    abstract getKeyboard(): KeyboardButton[][] | null | undefined;

    sendKeyboardFromButtons(bot: TelegramBot, userId: string, keyboard: KeyboardButton[][], message: string | undefined | null) {
        return bot.sendMessage(userId, message || '', {
            reply_markup: { keyboard, resize_keyboard: true },
            disable_web_page_preview: true
        });
    }

    sendKeybordFromArray(bot: TelegramBot, userId: string, menu: string[], message?: string | undefined | null) {
        const keyboard = menu.map(item => ([{ text: item }]));
        return this.sendKeyboardFromButtons(bot, userId, keyboard, message)
    }

    sendKeyboard(bot: TelegramBot, userId: string, message: string | undefined | null) {
        const keyboard = this.getKeyboard()

        if (keyboard) {
            return this.sendKeyboardFromButtons(bot, userId, keyboard, message)
        }
    }
}