interface PdfSong {
    title: string;
    content: string
}

interface DOCXSong {
    title: string;
    content: string
}

interface SymbolsData {
    [key: number]: {
        symbol: string,
        ii: {
            curr: number,
            preSymbol: string
        }[]
    }
}

interface GoogleListProps {
    driveId: string,
    limit: number,
    q: string,
    pageToken: string
}

interface GoogleFirstFileProps {
    driveId: string,
    q: string
}

interface GoogleCreateFolderProps {
    name: string,
    driveId: string
}

interface GoogleUploadFileProps {
    body: string,
    name: string,
    driveId: string,
    mediaMimeType: string,
    docMimeType: string
}

interface GoogleUpdateFileProps {
    fileId: string,
    name?: string,
    mimeType?: string;
    body?: any;
}

interface GoogleRenameSongProps {
    id: string,
    name: string
}

interface GoogleUpdateContentProps {
    id: string,
    content: string
}

interface GoogleUpdateSongProps {
    id: string,
    content: string,
    name: string
}

interface GoogleCreateSongProps {
    content: string,
    name: string
}

interface GoogleGetSongsProps {
    limit?: number,
    contains?: string,
    equals?: string,
    pagination?: string
}

interface GoogleGetSongProps {
    contains?: string,
    equals?: string,
}

interface NotionGetIdProps {
    googleId: string,
    name: string
}

interface NotionUploadSongProps {
    googleId: string,
    name: string,
    tonality?: string | null,
    chords?: string | null,
    tempo?: string | null,
    dynamic?: string | null
}

interface NotionConvertToPropertiesProps {
    name?: string | null,
    googleId?: string | null,
    tonality?: string | null,
    chords?: string | null,
    tempo?: string | null,
    dynamic?: string | null
}

interface NotionPropsEditableByCommands {
    tonality?: string | null,
    chords?: string | null,
    tempo?: string | null,
    dynamic?: string | null
}

interface NotionGetSongData {
    googleId: string,
    name: string
}

interface NotionDeleteSong {
    googleId: string,
    name: string
}

interface NotionLoadSong {
    googleId: string,
    name: string
}

interface GoogleSong {
    id: string,
    name: string,
    number: string,
    fullName: string,
    modifiedTime: string
}

interface NotionSong {
    //id, googleId, name (maybe change editedAt -> modifiedTime)
    id: string,
    name: string | null,
    googleId: string | null,
    modifiedTime: string,
    tonality: string | null,
    chords: string | null,
    tempo: string | null,
    dynamic: string | null,
    url?: string
}

interface TelegramSendDocumentProps {
    filename: string,
    modifiedTime?: string | undefined,
    buffer: Buffer
    contentType: string,
    userId?: string
}

interface TelegramSendFormatProps {
    modifiedTime?: string | undefined,
    buffer: Buffer
    userId?: string,
    fullName: string
}

interface TelegramSongMessage {
    id: number,
    fileId: string,
    modifiedTime: string
}

interface ManagerGetSongsProps {
    name: string,
    limit?: number,
    pagination?: string
}

interface MessagesLoadOption {
    buff: {
        func: Function;
        songArgs: (string | number | symbol)[];
    };
    sendFunc: Function;
}

type MessagesLoadOptions = {
    pdf: MessagesLoadOption,
    docx: MessagesLoadOption,
    online: MessagesLoadOption,
    offline: MessagesLoadOption
}

interface InlineResultFullOptions {
    id: string,
    fullName: string,
    name: string
}

interface InlineResultOptions {
    id: string,
    fullName: string
}

interface InlineCommand {
    func: Function
}

interface InlineTextCommand extends InlineCommand {
    name: string
}

interface InlineFileCommand extends InlineCommand {
    name: keyof MessagesLoadOptions
}

type InlineCommands = {
    file: {
        [key: string]: InlineFileCommand
    },
    text: {
        [key: string]: InlineTextCommand
    }
}

type TelegramSongMessages = {
    [key in keyof MessagesLoadOptions]?: TelegramSongMessage
}

interface ISong {
    song_id: string,
    messages?: TelegramSongMessages
}

interface AddCommandData {
    currentStep: number,
    stepsData: [...(string | null)[]]
}

interface UserCommandDataProperties {
    join?: string[],
    add?: AddCommandData,
    textProps?: UserCommandTextProperties
}

interface UserCommandTextProperties {
    content?: string,
    name?: string,
    chords?: string,
    tonality?: string,
    tempo?: string,
    dynamic?: string,
    delete?: string
}


interface Role {
    name: string,
    description?: string
}

interface RolesMap {
    [key: string]: Role
}

interface UserInfo {
    tg_id: string,
    role: string,
    fullname: string,
    username?: string,
}