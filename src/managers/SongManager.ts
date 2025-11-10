import { loadSongs, loadSong, deleteDBMessages } from '../mongodb/SongDB.js'
import * as g from '../services/google/google.js'
import * as n from '../services/notion/notion.js'
import { deleteMessage } from '../services/telegram/messages.js'
import Song from './entities/Song.js'

export const CREATE_SONG = {
    NO_DATA: 0,
    ALREADY_EXISTS: 1,
    GOOGLE_ERROR: 2,

}

class SongManager {
    songs: { [key: string]: Song } = {}

    async start() {
        const googleSongs = await g.getAll()
        console.log(' - all gsongs getted')
        const notionSongs = await n.loadSongs(googleSongs)
        console.log(' - all notion songs getted')

        for (let googleSong of googleSongs) {
            const id = googleSong.id
            const content = (await g.getSongContent(id)) || googleSong.name

            this.songs[id] = new Song(googleSong, notionSongs[id], content)
        }
        console.log(' - all songs getted')

        await loadSongs(Object.values(this.songs))

        console.log(' - all messages loaded')
    }

    async getSongByGoogle(gsong: GoogleSong) {
        const id = gsong.id

        if (!this.songs[id]) {
            const nsong = await n.loadSong(gsong)
            const content = (await g.getSongContent(id)) || gsong.name
            this.songs[id] = new Song(gsong, nsong, content)
        } else if (this.songs[id].modifiedTime < gsong.modifiedTime) {
            this.songs[id].content = (await g.getSongContent(id)) || gsong.name
            this.songs[id].modifiedTime = gsong.modifiedTime
            this.songs[id].fullName = gsong.fullName
            this.songs[id].name = gsong.name
            this.songs[id].number = gsong.number
        }

        return this.songs[id]
    }

    async getSongById(id: string) {
        const gsong = await g.getSongById(id)

        if (!gsong) {
            if (this.songs[id]) {
                delete this.songs[id]
            }

            return null;
        }

        return this.getSongByGoogle(gsong)
    }

    async getSongByName(name: string) {
        const gsong = await g.getSong({ contains: name })

        if (!gsong) {
            return null
        }

        return (await this.getSongByGoogle(gsong))
    }

    async getSongsByName({ name, limit, pagination }: ManagerGetSongsProps) {
        const gsongs = await g.getSongs({ contains: name, limit, pagination })
        const list = []

        for (let gsong of gsongs.list) {
            const song = await this.getSongByGoogle(gsong)
            list.push(song)
        }

        return {
            pagination: gsongs.pagination,
            songs: list
        }
    }

    async createSongFromAddCommand(data: (string | null | undefined)[]) {
        if (data.length < 2 || !data[0] || !data[1]) {
            return CREATE_SONG.NO_DATA
        }

        const [name, content, chords, tonality, tempo, dynamic] = data

        if (await g.isExist(name)) {
            return CREATE_SONG.ALREADY_EXISTS
        }

        const gsong = await g.createSong({ name, content })

        if (!gsong) return CREATE_SONG.GOOGLE_ERROR

        const nsong = await n.uploadSong({ googleId: gsong.id, name, tonality, chords, tempo, dynamic })

        this.songs[gsong.id] = new Song(gsong, nsong, content)

        await loadSong(this.songs[gsong.id]) //here

        return this.songs[gsong.id]
    }

    /*

        Нижнє підкреслювання означає що функція не буде перевіряти актуальність пісні
        Таке може знадобитись якщо точно знаєш що пісня є і не була змінена

    */

    async _updateSongContent(song: Song, newContent: string) {

        if (!this.songs[song.id] || song !== this.songs[song.id]) {
            throw new Error(`Strange error in _updateSongContent. ${this.songs[song.id] ? 'Songs are different' : 'Unknown song'}`)
        }

        const gsong = await g.updateSongContent({ id: song.id, content: newContent })

        if (!gsong) {
            return false
        }

        song.content = newContent
        song.modifiedTime = gsong.modifiedTime
        return true
    }

    async _renameSong(song: Song, newName: string) {

        if (!this.songs[song.id] || song !== this.songs[song.id]) {
            throw new Error(`Strange error in _renameSong. ${this.songs[song.id] ? 'Songs are different' : 'Unknown song'}`)
        }

        const fullName = `${song.number} ${newName}`
        const gsong = await g.renameSong({ id: song.id, name: fullName })

        if (!gsong) {
            return false
        }

        const nresult = await n.uploadSong({ googleId: song.id, name: newName })

        if (!nresult) {
            return false
        }

        song.name = newName
        song.fullName = fullName
        song.modifiedTime = gsong.modifiedTime
        return true
    }

    async _updateNotionByCommands(song: Song, ndata: NotionPropsEditableByCommands) {
        if (!this.songs[song.id] || song !== this.songs[song.id]) {
            throw new Error(`Strange error in _updateChordsUrl. ${this.songs[song.id] ? 'Songs are different' : 'Unknown song'}`)
        }

        const nsong = await n.uploadSong({ googleId: song.id, name: song.name, ...ndata })

        if (!nsong) {
            return false
        }

        if (song.notion) {
            if (ndata.chords !== undefined) {
                song.notion.chords = ndata.chords
            }

            if (ndata.tempo !== undefined) {
                song.notion.tempo = ndata.tempo
            }

            if (ndata.dynamic !== undefined) {
                song.notion.dynamic = ndata.dynamic
            }

            if (ndata.tonality !== undefined) {
                song.notion.tonality = ndata.tonality
            }

            song.notion.modifiedTime = nsong.modifiedTime
            song.notion.name = song.name
        } else {
            song.notion = nsong
        }
        return true
    }

    async _deleteSong(song: Song) {
        if (!this.songs[song.id] || song !== this.songs[song.id]) {
            throw new Error(`Strange error in _deleteSong. ${this.songs[song.id] ? 'Songs are different' : 'Unknown song'}`)
        }

        const gsong = await g.deleteSong(song.id)

        if (song.notion?.id) {
            await n.deleteSongById(song.notion.id)
        } else {
            await n.deleteSong({ googleId: song.id, name: song.name })
        }

        const messages = await deleteDBMessages(song)

        if (messages) {
            const ids = Object.values(messages).map(msg => msg.id)

            for (let id of ids) {
                await deleteMessage(id)
            }
        }

        delete this.songs[song.id]
        return gsong
    }


    /*

"inline_commands": {
        "online|on": "online", //general and online message
        "offline|off": "offline", //general and offline message
        "pdf": "pdf", //general and pdf message
        "doc|docx|document": "docx", //general and doc message
        "pp|propresenter": "propresenter", //general
        "nm|nomarks": "nomarks", //general
        "copy|cp|cpy": "copy", //general
        "ncopy": "copyNomarks",//general
        "pn|pnomarks": "propresenterNomarks",//general
        "info": "info",//notion
        "finfo|fullinfo|fi": "fullinfo", //general and notion
        "fullname|fname|name": "fullname" //name
    }


    */


    /*
    
    inline queries (diff types)
    by id
    by words


    
    */


}

/*

    identificator - google id. because google drive is main source
    
    Song props:
    - mongo id?
    - NotionSong
    - GoogleSong

    how i will get actual synced data? answer:

    when you get some info -> check modifiedTime (depends what info you need)
    when you change smth -> change info in manager GoogleSong / NotionSong


interface GoogleSong {
    id: string,
    name: string,
    createdTime: string,
    modifiedTime: string
}

interface NotionSong {
    id: string,
    name: string | null,
    googleId: string | null,
    modifiedTime: string,
    tonality: string | null,
    chords: string | null,
    tempo: string | null,
    dynamic: string | null,
}
*/

const manager = new SongManager()

export {
    manager
}