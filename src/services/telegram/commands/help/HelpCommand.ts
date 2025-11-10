import type TelegramBot from "node-telegram-bot-api";
import CustomCommand from "../CustomCommand.js";
import type { Message } from "node-telegram-bot-api";

const HELP_MESSAGE = 
    '<b>Використання бота за допомогою @</b>\n\n' +
    '<i>Слова пісні + посилання на акорди (при наявності)</i>\n' +
    '@ubcsongsbot Пошуковий запит\n\n' +

    '<i>Інформація про пісню (яка є в наявності)</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>info</b>\n\n' +

    '<i>Інформація про пісню + слова (яка є в наявності)</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>finfo/fullinfo/fi</b>\n\n' +

    '<i>Повна назва пісні з номером</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>fullname/fname/name</b>\n\n' +

    '<i>Отримати пісню у pdf</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>pdf</b>\n\n' +

    '<i>Онлайн презентація пісні</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>online/on</b>\n\n' +

    '<i>Документ Word пісні</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>doc/docx/document</b>\n\n' +

    '<i>Презентація офлайн формату</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>offline/off</b>\n\n' +

    '<i>Слова пісні для імпорта у ProPresenter (відразу копіюються при натисканні)</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>pp/propresenter</b>\n\n' +

    '<i>Cлова пісні без розділових знаків</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>nm/nomarks</b>\n\n' +

    '<i>Слова пісні (відразу копіюються при натисканні)</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>copy/cp/cpy</b>\n\n' +

    '<i>Слова пісні без розділових знаків (відразу копіюються при натисканні)</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>ncopy</b>\n\n' +
    
    '<i>Слова пісні для імпорта у ProPresenter без розідлових знаків (відразу копіюються при натисканні)</i>\n' +
    '@ubcsongsbot Пошуковий запит <b>pn/pnomarks</b>\n\n' +

    '<b>Команди</b>\n' +
    '  /start або /menu - загальне меню\n' +
    '  /help - допомога\n\n';

export class HelpCommand extends CustomCommand {
    constructor(parent: CustomCommand){
        super({
            pattern: "\/help|\/допомога|допомога",
            parent,
            anyPlace: true,
            onlyAction: true,
            keyboardText: 'Допомога'
        })
    }

    execute(bot: TelegramBot, message: Message) {
        const userId = message.from?.id.toString() || message.chat.id.toString()
        bot.sendMessage(userId, HELP_MESSAGE, { parse_mode: "HTML"}) //type ParseMode = "Markdown" | "MarkdownV2" | "HTML";
    }

    onMessage(bot: TelegramBot, message: TelegramBot.Message) {
        return null
    }

    getKeyboard(): TelegramBot.KeyboardButton[][] | null | undefined {
        return null
    }
}