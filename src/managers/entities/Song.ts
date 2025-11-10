
export default class Song {
    id: string;
    name: string;
    fullName: string;
    number: string;
    modifiedTime: string;

    content: string;

    notion: NotionSong | null;

    messages: {[key in keyof TelegramSongMessages]?: TelegramSongMessage}

    constructor(gsong: GoogleSong, nsong: NotionSong | null, content: string) {
        this.id = gsong.id
        this.modifiedTime = gsong.modifiedTime
        this.name = gsong.name
        this.fullName = gsong.fullName
        this.number = gsong.number

        this.content = content

        this.notion = nsong

        this.messages = {}
    }

    get(key: string | number | symbol) {
        return this[key as keyof Song]
    }

    setMessage(key: keyof TelegramSongMessages, message: TelegramSongMessage) {
        this.messages[key] = message
    }

    toString() {
        return `(id: ${this.id}, fullName: ${this.fullName})`
    }

    getGoogleLink() {
        return `https://docs.google.com/document/d/${this.id}`
    }
}