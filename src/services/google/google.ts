import { drive_v3, google } from 'googleapis';
import dotenv from 'dotenv'
import type { GaxiosResponse } from 'gaxios';
import { getTextNumber } from '../../utils/text/text.js';
import loadEnv from '../../loadenv.js';

loadEnv(dotenv)

const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive'
];

let drive: drive_v3.Drive;

function hasDrive() {
    return !!drive;
}

export function getOAuth2Client() {
    
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    oAuth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return oAuth2Client;
}

async function authorize() {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
        throw new Error('\n\n[Google] No refresh token!\n\n')
    }
    
    if (!process.env.GOOGLE_DRIVE_FOLDER) {
        throw new Error('\n\n[Google] No drive folder!\n\n')
    }
    
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error('\n\n[Google] No client id!\n\n')
    }

    if (!process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('\n\n[Google] No client secret!\n\n')
    }

    const auth = getOAuth2Client()

    drive = google.drive({ version: 'v3', auth });
    
    return true;
}

async function checkQuota() {
    const about = await drive.about.get({ fields: 'user, storageQuota' });
    console.log(about?.data?.user?.emailAddress);
    console.log(about?.data?.storageQuota);
}

async function countSongs() {
    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER}' in parents and trashed=false`,
        pageSize: 1000,
        fields: 'files(id)',
    });

    return res.data.files ? res.data.files.length : 0;
}

async function getNextTextNumber() {
    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER}' in parents and trashed = false`,
        fields: 'files(name)',
        orderBy: 'name desc',
        pageSize: 1,
    });

    const list = res.data.files;

    if (!list || list.length === 0 || !list[0].name) {
        //не знаю як таке можливо якщо хоч один файл є, але на всякий випадок беру номер з кількості файлів
        const count = await countSongs()
        return getTextNumber(count + 1)
    }

    const lastTextNumber = list[0].name.slice(0, 4)

    return getTextNumber(parseInt(lastTextNumber, 10) + 1)
}

async function getAll() {
    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER}' in parents and trashed=false`,
        fields: ' files(id, name, modifiedTime)',
        pageSize: 1000
    });

    const list = res.data.files;

    if (!list || list.length === 0) {
        return [];
    }

    return convertFilesToGoogleSong(list)
}

async function isExist(name: string) {
    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER}' in parents and trashed=false`,
        fields: ' files(id, name, modifiedTime)'
    });

    const list = res.data.files;

    if (!list || list.length === 0) {
        return false
    }

    name = name.toLowerCase()

    for (let file of list) {
        if (!file.name) {
            continue;
        }

        const compName = file.name.slice(5).toLowerCase()

        if (compName === name) return true
    }

    return false
}

async function getSongsByIds(ids: string[]) {
    const list = []
    const notfound = []

    for (let fileId of ids) {
        let res = await drive.files.get({
            fileId,
            fields: 'id, name, modifiedTime'
        })

        if (res && res.data) {
            const song: GoogleSong | null = convertFileToGoogleSong(res.data)

            if (song === null) {
                notfound.push(fileId)
            } else {
                list.push(song)
            }
        } else {
            notfound.push(fileId)
        }
    }

    return { list, notfound }
}

function convertFileToGoogleSong(file: drive_v3.Schema$File) {
    if (!file.id || !file.name) {
        return null;
    }

    const data: GoogleSong = {
        id: file.id,
        fullName: file.name,
        number: file.name.slice(0, 4),
        name: file.name.slice(5),
        modifiedTime: file.modifiedTime ? file.modifiedTime : (new Date()).toISOString(),
    }

    return data;
}

function convertFilesToGoogleSong(files: drive_v3.Schema$File[]) {
    return files.map(file => convertFileToGoogleSong(file)).filter(song => song !== null)
}

function convertToGoogleSong(res: GaxiosResponse<drive_v3.Schema$File>) {
    if (!res || !res.data) {
        return null
    }

    return convertFileToGoogleSong(res.data)
}

async function getSongById(id: string) {
    let res = await drive.files.get({
        fileId: id,
        fields: 'id, name, modifiedTime'
    })

    return convertToGoogleSong(res)
}

/*

song change manipulation:
- rename
- update content
- update name and content
- create
- delete

song get methods
- get songs (limit, queries) with info (modifiedTime, id, name)
- get song content by id
- get one song (queries) with info ((modifiedTime, id, name))

*/

async function renameSong({ id, name }: GoogleRenameSongProps) {
    const res = await drive.files.update({
        fields: 'id, name, modifiedTime',
        fileId: id,
        requestBody: {
            name,
        }
    });
    return convertToGoogleSong(res)
}

async function updateSongContent({ id, content }: GoogleUpdateContentProps) {
    const res = await drive.files.update({
        fields: 'id, name, modifiedTime',
        fileId: id,
        media: {
            body: content
        }
    });
    return convertToGoogleSong(res);
}


async function updateSong({ id, name, content }: GoogleUpdateSongProps) {
    const res = await drive.files.update({
        fields: 'id, name, modifiedTime',
        fileId: id,
        media: {
            body: content
        },
        requestBody: {
            name,
        }
    });
    return convertToGoogleSong(res);
}

async function createSong({ name, content }: GoogleCreateSongProps) {
    const number = await getNextTextNumber()
    const res = await drive.files.create({
        uploadType: 'media',
        fields: 'id, name, modifiedTime',
        requestBody: {
            name: `${number} ${name}`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER || ''],
            mimeType: 'application/vnd.google-apps.document'
        },
        media: {
            body: content,
            mimeType: 'text/plain'
        }
    });
    return convertToGoogleSong(res);
}

async function canDelete(id: string) {
    const res = await drive.files.get({
        fileId: id,
        fields: 'id, name, capabilities(canTrash)',
    })

    return !!res.data.capabilities?.canTrash
}

async function deleteSong(id: string) {
    if (!(await canDelete(id))) {
        return false
    }

    const res = await drive.files.update({
        fileId: id,
        fields: 'id',
        requestBody: {
            trashed: true
        }
    })

    return true
}

function validForQuery(query: string) {
    const result = query.replace(/[^а-яА-ЯїЇҐґЄєіІ̆\d' ̈]/g, '').replace('\'', '\\\'').slice(0, 50);
    return result
}

async function getSongs({ contains, equals, limit, pagination }: GoogleGetSongsProps) {
    let q = ''

    if (contains) {
        q = ` and name contains '${validForQuery(contains)}'`
    } else if (equals) {
        q = ` and name = '${validForQuery(equals)}'`
    }

    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER}' in parents and trashed=false${q}`,
        pageSize: limit,
        fields: 'nextPageToken, files(id, name, modifiedTime)',
        pageToken: pagination
    });

    const list = res.data.files;

    if (!list || list.length === 0) {
        return { list: [], pagination: null };
    }

    return { list: convertFilesToGoogleSong(list), pagination: res.data.nextPageToken }
}

async function getSongContent(id: string) {
    const res = await drive.files.export({
        fileId: id,
        mimeType: 'text/plain'
    });

    if (typeof res.data === 'string') {
        let content: string = res.data;

        if (content.charCodeAt(0) == 65279) {
            content = content.slice(1)
        }

        return content.replaceAll('\r\n\r\n\r\n', '\r\n\r\n')
    }

    return null;
}

async function getSong({ contains, equals }: GoogleGetSongProps) {
    let q = ''

    if (contains) {
        q = ` and name contains '${validForQuery(contains)}'`
    } else if (equals) {
        q = ` and name = '${validForQuery(equals)}'`
    }

    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER}' in parents and trashed=false${q}`,
        pageSize: 1,
        fields: 'files(id, name, modifiedTime)',
    });

    const list = res.data.files;

    if (!list || list.length === 0) {
        return null;
    }

    return convertFileToGoogleSong(list[0])
}


export {
    hasDrive,
    authorize,
    validForQuery,
    countSongs,
    getAll,
    getSong,
    getSongs,
    getSongsByIds,
    getSongById,
    renameSong,
    deleteSong,
    updateSongContent,
    getSongContent,
    updateSong,
    createSong,
    isExist,
    checkQuota
}