import * as text from '../../utils/text/text.js'
import Song from '../../managers/entities/Song.js'

export function inlineDefaultResult(song: Song) {
    let message = `*${song.name}*\r\n\r\n${song.content}`

    if (song.notion?.chords) {
        message += `\r\n\r\n[>>> АКОРДИ <<<](${song.notion.chords})`
    }

    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description: song.content,
        input_message_content: {
            message_text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        }
    }
}

export function inlineInfoResult(song: Song) {
    const notion = song.notion
    let message = `<b><i>Назва</i></b>: ${song.fullName}\n`
    let links = `<a href="https://docs.google.com/document/d/${song.id}">GOOGLE FILE</a>`

    if (notion) {
        if (notion.tempo) message += `<b><i>Темп</i></b>: ${notion.tempo}\n`
        if (notion.tonality) message += `<b><i>Тональність</i></b>: ${notion.tonality}\n`
        if (notion.dynamic) message += `<b><i>Динаміка</i></b>: ${notion.dynamic}\n`
        if (notion.chords) {
            links += `  |  <a href="${notion.chords}">АКОРДИ</a>`
        }
    }

    message += `\n${links}`

    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description: song.content,
        input_message_content: {
            message_text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        },
    }
}

export function inlineFullInfoResult(song: Song) {
    const description = song.content
    const notion = song.notion
    let message = `<b><i>Назва</i></b>: ${song.fullName}\n`
    let links = `<a href="https://docs.google.com/document/d/${song.id}">GOOGLE FILE</a>`

    if (notion) {
        if (notion.tempo) message += `<b><i>Темп</i></b>: ${notion.tempo}\n`
        if (notion.tonality) message += `<b><i>Тональність</i></b>: ${notion.tonality}\n`
        if (notion.dynamic) message += `<b><i>Динаміка</i></b>: ${notion.dynamic}\n`
        if (notion.chords) {
            links += `  |  <a href="${notion.chords}">АККОРДИ</a>`
        }
    }

    message += `\n${description}\n\n${links}`

    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description,
        input_message_content: {
            message_text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        },
    }
}

export function inlineFullnameResult(song: Song) {
    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description: song.content,
        input_message_content: {
            message_text: song.fullName,
        },
    }
}

export function inlineCopyResult(song: Song) {
    const description = song.content
    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description,
        input_message_content: {
            message_text: `\`${description}\``,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        }
    }
}

export function inlinePropresenterResult(song: Song) {
    const description = text.convertContentToProPresenter(song.content)
    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description,
        input_message_content: {
            message_text: `\`${description}\``,
            parse_mode: 'Markdown'
        }
    }
}

export function inlineNomarksResult(song: Song) {
    const description = text.normalizeWithoutMarks(song.content)
    let message = `*${song.name}*\r\n\r\n${description}`

    if (song.notion?.chords) {
        message += `\r\n\r\n[>>> АКОРДИ <<<](${song.notion.chords})`
    }

    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description,
        input_message_content: {
            message_text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        }
    }
}

export function inlinePPNomarksResult(song: Song) {
    const description = text.convertToPPWithoutMarks(song.content)
    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description,
        input_message_content: {
            message_text: `\`${description}\``,
            parse_mode: 'Markdown'
        }
    }
}

export function inlineCopyNomarksResult(song: Song) {
    const description = text.normalizeWithoutMarks(song.content)
    return {
        id: song.id,
        title: song.fullName,
        type: 'article',
        description,
        input_message_content: {
            message_text: `\`${description}\``,
            parse_mode: 'Markdown'
        }
    }
}

export function inlineOnlineResult(song: Song, fileId: string) {
    return {
        id: song.id,
        title: `${song.fullName} (онлайн)`,
        type: 'document',
        document_file_id: fileId
    }
}

export function inlineOfflineResult(song: Song, fileId: string) {
    return {
        id: song.id,
        title: `${song.fullName}`,
        type: 'document',
        document_file_id: fileId
    }
}

export function inlineDOCXResult(song: Song, fileId: string) {
    return {
        id: song.id,
        title: `${song.fullName}`,
        type: 'document',
        document_file_id: fileId
    }
}

export function inlinePDFResult(song: Song, fileId: string) {
    return {
        id: song.id,
        title: `${song.fullName}`,
        type: 'document',
        document_file_id: fileId
    }
}