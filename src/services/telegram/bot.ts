import TelegramBot from "node-telegram-bot-api";
import dotenv from 'dotenv'
import loadEnv from "../../loadenv.js";
import type CustomCommand from "./commands/CustomCommand.js";

loadEnv(dotenv)

const botOptions = process.env.NODE_ENV == 'development' ? {} : {
    webHook: {
        port: process.env.TELEGRAM_BOT_WEBHOOK_PORT ? Number(process.env.TELEGRAM_BOT_WEBHOOK_PORT) : 8080
    }
};

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '', botOptions);