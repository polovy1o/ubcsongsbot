import TelegramBot from "node-telegram-bot-api";
import CustomCommand from "./CustomCommand.js";
import type { KeyboardButton, Message } from "node-telegram-bot-api";
import { HelpCommand } from "./help/HelpCommand.js";
import { JoinCommand } from "./join/JoinCommand.js";
import { deleteUserCommand, setUserCommand } from "../../../state/functions.js";
import { AddCommand } from "./add/AddCommand.js";
import { EditContentCommand } from "./editcontent/EditContentCommand.js";
import { EditNameCommand } from "./editname/EditNameCommand.js";
import { EditChordsCommand } from "./editchords/EditChordsCommand.js";
import { EditTempoCommand } from "./edittempo/EditTempoCommand.js";
import { EditTonalityCommand } from "./edittonality/EditTonalityCommand.js";
import { EditDynamicCommand } from "./editdynamic/EditDynamicCommand.js";
import { DeleteSongCommand } from "./deletesong/DeleteSongCommand.js";
import roles from "../../../roles/UserRoles.js";
import { handleGetAccessCommands } from "../high_access.js";

interface AccessCommands {
    [key: string]: {
        anyPlaceCommands: CustomCommand[],
        commands: CustomCommand[]
    }
}

type KButton = { text: string }[]

interface AccessKeyboards {
    [key: string]: KButton[]
}

export class MenuCommand extends CustomCommand {
    anyPlaceCommands: CustomCommand[] = []
    accessCommands: AccessCommands = {}
    accessKeyboards: AccessKeyboards = {}
    ownerCommands: CustomCommand[] = []
    ownerAnyplaceCommands: CustomCommand[] = []
    ownerKeyboards: KButton[] = []

    constructor() {
        super({
            keyboardText: "Головне меню",
            pattern: "\/start|\/menu|головне меню",
            subcommands: [],
            menu: [
                // "Об'єднати пісні",
                // "Додати пісню",
                // "Редагувати слова пісні",
                // "Редагувати назву пісні",
                // "Редагувати акорди пісні",
                // "Редагувати темп пісні",
                // "Редагувати тональність пісні",
                // "Редагувати динаміку пісні",
                // "Видалити пісню",
                // "Допомога",
            ],
            anyPlace: true,
            onlyAction: false
        })

        const allSubcommands = [
            new JoinCommand(this),
            new AddCommand(this),
            new EditContentCommand(this),
            new EditNameCommand(this),
            new EditChordsCommand(this),
            new EditTempoCommand(this),
            new EditTonalityCommand(this),
            new EditDynamicCommand(this),
            new DeleteSongCommand(this),
            new HelpCommand(this),
        ]

        this.subcommands = []
        this.defaultKeyboard = []

        for (let subcommand of allSubcommands) {
            if (subcommand.anyPlace) {
                this.ownerAnyplaceCommands.push(subcommand)
            } else {
                this.ownerCommands.push(subcommand)
            }

            if (subcommand.keyboardText) {
                this.ownerKeyboards.push([{ text: subcommand.keyboardText }])
            }

            if (subcommand.rolesAccess) {
                for (let role of subcommand.rolesAccess) {
                    let anyPlaceCommands: CustomCommand[]
                    let commands: CustomCommand[]
                    let keyboard: KButton[]

                    if (!this.accessKeyboards[role]) {
                        this.accessKeyboards[role] = keyboard = []
                    } else {
                        keyboard = this.accessKeyboards[role]
                    }

                    if (!this.accessCommands[role]) {
                        anyPlaceCommands = []
                        commands = []

                        this.accessCommands[role] = { anyPlaceCommands, commands }
                    } else {
                        anyPlaceCommands = this.accessCommands[role].anyPlaceCommands
                        commands = this.accessCommands[role].commands
                    }


                    if (subcommand.anyPlace) {
                        anyPlaceCommands.push(subcommand)
                    } else {
                        commands.push(subcommand)
                    }

                    if (subcommand.keyboardText)
                        keyboard.push([{ text: subcommand.keyboardText }])
                }
            } else {
                if (subcommand.anyPlace) {
                    this.anyPlaceCommands.push(subcommand)
                } else {
                    this.subcommands.push(subcommand)
                }
                if (subcommand.keyboardText) {
                    this.menu?.push(subcommand.keyboardText)
                    this.defaultKeyboard.push([{ text: subcommand.keyboardText }])
                }

            }
        }
    }

    sendMenuKeyboard(bot: TelegramBot, userId: string) {
        deleteUserCommand(userId)
        this.sendKeyboard(bot, userId)
    }

    execute(bot: TelegramBot, message: Message) {
        //const subcommand = this.checkSubcommands(bot, message)
        const userId = message.from?.id.toString() || message.chat.id.toString()
        this.sendMenuKeyboard(bot, userId)
        return
    }

    getAccessAnyplaceCommands(role: string) {
        return this.accessCommands[role]?.anyPlaceCommands
    }

    getAccessSimpleCommands(role: string) {
        return this.accessCommands[role]?.commands
    }

    getAccessAllCommands(role: string) {
        return this.accessCommands[role]
    }

    onMessage(bot: TelegramBot, message: Message) {
        const text = message.text?.toLowerCase()

        if (!text) {
            return
        }

        if (this.checkThis(message.text || '')) {
            this.execute(bot, message)
            return
        }

        const subcommand = this.checkSubcommands(bot, message)
        const userId = message.from?.id.toString() || message.chat.id.toString()

        if (subcommand) {
            setUserCommand(userId, subcommand)
            return;
        }

        const role = roles.getUserRole(userId)

        if (role) {
            const accessSubcommands = this.getAccessSimpleCommands(role)

            if (accessSubcommands) {
                for (let subcommand of accessSubcommands) {
                    const check = subcommand.checkThis(text)
                    if (check) {
                        if (typeof check === 'string') {
                            subcommand.execute(bot, message, check)
                        } else {
                            subcommand.execute(bot, message)
                        }
                        setUserCommand(userId, subcommand)
                        return
                    }
                }
            }
        } else if (roles.isOwner(userId)) {
            for (let subcommand of this.ownerCommands) {
                const check = subcommand.checkThis(text)
                if (check) {
                    if (typeof check === 'string') {
                        subcommand.execute(bot, message, check)
                    } else {
                        subcommand.execute(bot, message)
                    }
                    setUserCommand(userId, subcommand)
                    return
                }
            }
        }

        handleGetAccessCommands(userId, message)
    }

    getKeyboard(): KeyboardButton[][] | null | undefined {
        return this.defaultKeyboard
    }

    getKeyboardFor(userId: string) {
        const role = roles.getUserRole(userId)
        const defaultKeyboard = this.getKeyboard()

        if (!role || !this.accessKeyboards[role]?.length) {
            if (roles.isOwner(userId)) {
                return this.ownerKeyboards;
            }
            return this.defaultKeyboard
        }

        return defaultKeyboard ? [...defaultKeyboard, ...this.accessKeyboards[role]] : defaultKeyboard
    }

    sendKeyboard(bot: TelegramBot, userId: string, message?: string | undefined | null) {
        const keyboard = this.getKeyboardFor(userId)

        if (keyboard) {
            return this.sendKeyboardFromButtons(bot, userId, keyboard, message || "Вітаю! Оберіть пункт меню")
        }
    }

    getAnyPlaceCommands(): CustomCommand[] {
        return this.anyPlaceCommands
    }
}

const startCommand = new MenuCommand()

export default startCommand