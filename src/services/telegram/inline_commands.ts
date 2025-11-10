import * as iqf from "./inline_query_functions.js"

export const INLINE_COMMANDS: InlineCommands = {
    file: {
        "online|on": {
            name: "online",
            func: iqf.inlineOnlineResult
        },
        "offline|off": {
            name: "offline",
            func: iqf.inlineOfflineResult
        },
        "pdf": {
            name: "pdf",
            func: iqf.inlinePDFResult
        },
        "doc|docx|document": {
            name: "docx",
            func: iqf.inlineDOCXResult
        },
    },
    text: {
        "pp|propresenter": {
            name: "propresenter",
            func: iqf.inlinePropresenterResult
        },
        "nm|nomarks": {
            name: "nomarks",
            func: iqf.inlineNomarksResult
        },
        "copy|cp|cpy": {
            name: "copy",
            func: iqf.inlineCopyResult
        },
        "ncopy": {
            name: "copyNomarks",
            func: iqf.inlineCopyNomarksResult
        },
        "pn|pnomarks": {
            name: "copyNomarks",
            func: iqf.inlinePPNomarksResult
        },
        "info": {
            name: "info",
            func: iqf.inlineInfoResult
        },
        "finfo|fullinfo|fi": {
            name: "fullinfo",
            func: iqf.inlineFullInfoResult
        },
        "fullname|fname|name": {
            name: "fullname",
            func: iqf.inlineFullnameResult
        },
    }


}
export const INLINE_TEXT_COMMANDS_KEYS = Object.keys(INLINE_COMMANDS.text)
export const INLINE_FILE_COMMANDS_KEYS = Object.keys(INLINE_COMMANDS.file)
export const INLINE_TEXT_COMMANDS = INLINE_COMMANDS.text
export const INLINE_FILE_COMMANDS = INLINE_COMMANDS.file