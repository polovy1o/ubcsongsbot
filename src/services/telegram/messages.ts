import { bot } from './bot.js'

import dotenv from 'dotenv'
import loadEnv from "../../loadenv.js"

loadEnv(dotenv)

const chatId = process.env.TELEGRAM_DOCUMENT_CHAT || ''

async function sendDocument({ userId, filename, modifiedTime, buffer, contentType }: TelegramSendDocumentProps): Promise<TelegramSongMessage | null> {
    const msg = await bot.sendDocument(userId || chatId, buffer, {}, {
        filename,
        contentType
    })

    if (!msg || !msg.document) {
        return null
    }

    return {
        id: msg.message_id,
        fileId: msg.document.file_id,
        modifiedTime: modifiedTime || (new Date()).toISOString()
    }
}

export async function sendSongOnline({fullName, buffer, modifiedTime, userId}: TelegramSendFormatProps) {
    return await sendDocument({
        filename: `${fullName} (онлайн).pptx`,
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        modifiedTime,
        buffer,
        userId
    })
}

export async function sendSongOffline({fullName, buffer, modifiedTime, userId}: TelegramSendFormatProps) {
    return await sendDocument({
        filename: `${fullName}.pptx`,
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        modifiedTime,
        buffer,
        userId
    })
}

export async function sendSongDOCX({fullName, buffer, modifiedTime, userId}: TelegramSendFormatProps) {
    return await sendDocument({
        filename: `${fullName}.docx`,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        modifiedTime,
        buffer,
        userId
    })
}

export async function sendSongPDF({fullName, buffer, modifiedTime, userId}: TelegramSendFormatProps) {
    return await sendDocument({
        filename: `${fullName}.pdf`,
        contentType: 'application/pdf',
        modifiedTime,
        buffer,
        userId
    })
}

export async function deleteMessage(id: number) {
    try {
        const result = await bot.deleteMessage(chatId, id)
        return result
    } catch (e) {
        console.log(`Error while deleting message: ${id}`)
        return false
    }
}