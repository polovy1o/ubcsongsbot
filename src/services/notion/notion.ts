import { Client } from "@notionhq/client"
import { dynamicMap } from "./dynamic_map.js";
import { tempoMap } from "./tempo_map.js";
import 'dotenv/config'
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

let notion = new Client();
let database_id: string = ''

function load() {
    database_id = process.env.NOTION_DATABASE || ''
    notion = new Client({ auth: process.env.NOTION_TOKEN });
}

async function getIdByGoogleId(googleId: string)
{
    let res = await notion.databases.query({
        database_id,
        page_size: 1,
        filter: {
            property: 'TXT',
            url: {
                equals: `https://docs.google.com/document/d/${googleId}`
            }
        },

    });
    
    if (!res.results.length) {
        return null;
    }

    return res.results[0].id
}

async function getIdByName(name: string)
{
    let res = await notion.databases.query({
        database_id,
        page_size: 1,
        filter: {
            property: 'Name',
            title: {
                equals: name
            }
        }
    });

    if (!res.results.length) {
        return null;
    }

    return res.results[0].id
}

async function getId({googleId, name}: NotionGetIdProps)
{
    return getIdByGoogleId(googleId) || getIdByName(name)
}

function convertToProperties({name, googleId, tonality, chords, tempo, dynamic}: NotionConvertToPropertiesProps)
{
    const properties: any = {}

    if (name !== undefined) {
        properties.Name = {
            title: [{ text: { content: name } }]
        }
    }

    if (tonality !== undefined) {
        properties['Тональність'] = {
            rich_text: [
                {
                    text: { content: tonality || '' }
                }
            ]
        }
    }

    if (chords !== undefined) {
        properties['Аккорди'] = { url: chords }
    }

    if (googleId !== undefined) {
        properties.TXT = { url: `https://docs.google.com/document/d/${googleId}` }
    }

    if (tempo !== undefined) {
        properties['Темп'] = {
            select: tempo ? tempoMap[tempo.toLowerCase()] : null
        }
    }

    if (dynamic !== undefined) {
        properties['Динаміка'] = {
            select: dynamic ? dynamicMap[dynamic.toLowerCase()] : null
        }
    }

    return properties
}

async function uploadSong({googleId, name, tonality, chords, tempo, dynamic}: NotionUploadSongProps) {
    let id = await getId({googleId, name})

    if (!id) {
        const page = await notion.pages.create({
            parent: { database_id },
            properties: convertToProperties({name, googleId, tonality, chords, tempo, dynamic})
        })

        return convertToSongData(page)
    }

    const page = await notion.pages.update({
        page_id: id,
        properties: convertToProperties({name, googleId, tonality, chords, tempo, dynamic})
    })

    return convertToSongData(page)
}

async function convertToSongData(page: any)
{
    if (!page) {
        return null
    }

    const d = JSON.parse(JSON.stringify(page))

    if (!d.properties || !d.last_edited_time) {
        return null;
    }

    const props = d.properties
    const data: NotionSong = {
        id: d.id,
        name: props.Name.title.length ? props.Name.title[0].plain_text : null,
        googleId: props.TXT.url ? props.TXT.url.slice(35) : null,
        modifiedTime: d.last_edited_time,
        tonality: props['Тональність'].rich_text.length ? props['Тональність'].rich_text[0].plain_text : null,
        chords: props['Аккорди'].url,
        tempo: props['Темп'].select ? props['Темп'].select.name : null,
        dynamic: props['Динаміка'].select ? props['Динаміка'].select.name : null,
        url: page.public_url
    }

    return data;
}

function isFullPage(page: any): page is PageObjectResponse {
  return 'object' in page && page.object === 'page' && 'archived' in page;
}


async function getSongDataById(id: string | null)
{
    if (id === null) {
        return null
    }

    const page = await notion.pages.retrieve({page_id: id})

    if (isFullPage(page) && page.archived) {
        return null
    }

    return convertToSongData(page)
}

async function getSongData({googleId, name}: NotionGetSongData)
{
    const id: string | null = await getId({googleId, name})
    return await getSongDataById(id)
}

async function getSongDataByName(name: string)
{
    const id: string | null = await getIdByName(name)
    return await getSongDataById(id)
}

async function getSongDataByGoogleId(googleId: string)
{
    const id: string | null = await getIdByGoogleId(googleId)
    return await getSongDataById(id)
}

async function deleteSong({googleId, name}: NotionDeleteSong)
{
    const id: string | null = await getId({googleId, name})
    return await deleteSongById(id)
}

async function deleteSongById(id: string | null)
{
    if (id === null) {
        return null
    }

    const page = await notion.pages.update({
        page_id: id,
        archived: true
    })

    return page ? page.id : null
}

async function deleteSongByGoogleId(googleId: string)
{
    const id: string | null = await getIdByGoogleId(googleId)
    return await deleteSongById(id)
}

async function deleteSongByName(name: string)
{
    const id: string | null = await getIdByName(name)
    return await deleteSongById(id)
}

async function loadSong({name, id, modifiedTime}: GoogleSong) { //add second param
    let song = await getSongData({googleId: id, name})

    if (!song) {
        const page = await notion.pages.create({
            parent: { database_id },
            properties: convertToProperties({name, googleId: id})
        })

        return convertToSongData(page)
    }

    if (modifiedTime > song.modifiedTime || !song.name || !song.googleId) {
        const page = await notion.pages.update({
            page_id: song.id,
            properties: convertToProperties({name, googleId: id})
        })
        return convertToSongData(page)
    }

    return song
}

async function loadSongs(gsongs: GoogleSong[]) {
    const songs: {[key: string]: NotionSong | null} = {}

    for (let gsong of gsongs)
    {
        songs[gsong.id] = await loadSong(gsong)
    }

    /*
    
    if Notion song is null?
    
    variant 1
        return "empty" NotionSong (only with name and google id)
    
    variant 2 (choosen. because its more understandable)
        return null

    */

    return songs;
}

export {
    loadSong,
    loadSongs,
    deleteSong,
    deleteSongById,
    load,
    uploadSong
};