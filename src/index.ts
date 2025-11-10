import fonts from "./utils/fonts/fonts.js";
import * as google from './services/google/google.js'
import * as telegram from './services/telegram/telegram.js'
import * as notion from './services/notion/notion.js'
import dotenv from 'dotenv'
import { connectDB } from "./database.js";
import { manager } from "./managers/SongManager.js";
import loadEnv from "./loadenv.js";

async function main() {
    loadEnv(dotenv)

    //Notion
    notion.load()

    //шрифти
    await fonts.loadFonts()
    console.log('fonts loaded')

    //база даних
    await connectDB()
    console.log('mongo loaded')

    //гугл
    await google.authorize();
    console.log('google loaded')

    //телеграм
    await manager.start()
    console.log('songs loaded')
    telegram.start()
}

await main()
