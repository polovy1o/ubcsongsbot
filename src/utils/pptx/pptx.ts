import fs from 'fs'
import JSZip from 'jszip'
import PptxGenJS from 'pptxgenjs';
import sax from 'sax'
import fonts from '../fonts/fonts.js';
import defaultConfig from './config.json' with { type: "json" };
import * as text from '../text/text.js';

let config = JSON.parse(JSON.stringify(defaultConfig))

function setConfigData(data: any)
{
    config = data
}

async function getSlideXML(fileBuffer: Buffer): Promise<string[]> {
    const zip: JSZip = await new JSZip().loadAsync(fileBuffer);
    const slideXMLArray: string[] = [];
    let slideXML: string;

    for (let filename of Object.keys(zip.files)) {
        let match = filename.match(/slide(\d+)\.xml$/)

        if (!match) continue;

        slideXML = await zip.files[filename].async("string");
        slideXMLArray[Number(match[1]) - 1] = slideXML;
    };

    return slideXMLArray;
}

async function parseSlideXMLtoObject(slideXMLArray: string[]): Promise<string[][]> {
    let slides = [];

    for (let i = 0; i < slideXMLArray.length; i++) {
        const slideXML: string = slideXMLArray[i];
        const parser: sax.SAXParser = sax.parser(true);
        let j: number = 0;

        slides[i] = ['']

        parser.onopentag = (node) => {
            if (node.name === "a:p" || node.name === "a:br") {
                slides[i][++j] = '';
            }
        };

        parser.ontext = (t) => {
            if (t.trim() || t == ' ') {
                slides[i][j] += t
            }
        };

        parser.write(slideXML.toString()).close();
        slides[i] = slides[i].map(line => line.split(' ').filter(val => val !== '').join(' ')).filter(line => line !== '')
    }

    return slides.filter((val) => !!val.length);
}

async function parsePPTXFromFile(filepath: string) {
    try {
        let pptxFileBuffer = fs.readFileSync(filepath);
        return parsePPTXFromBuffer(pptxFileBuffer)
    } catch (err) {
        console.log(err);
        return ''
    }    
}

async function parsePPTXFromBuffer(pptxFileBuffer: Buffer) {
    const slideXMLArray = await getSlideXML(pptxFileBuffer);
    return parseSlideXMLtoObject(slideXMLArray)
}


function offlineSlide(pres: PptxGenJS, text = '') {
    const slide = pres.addSlide()
    slide.background = { color: config.off.background }
    if (text !== '') {
        slide.addText(text, {
            y: 0,
            x: 0,
            w: '100%',
            h: '100%',
            ...config.off.textbox
        })
    }
    return slide
}

async function getOfflinePPTXBuffer(content: string) {
    const pres = getSongOfflinePPTXFromContent(content)
    const buffer = await pres.write({ outputType: 'base64' });
    return Buffer.from(buffer.toString(), 'base64')
}

function convertContentToOffline(content: string) {
    let data = content.split('\r\n\r\n')
    const lineBreak = config.off.line_break

    if (!lineBreak) {
        return data;
    }

    let textPxWidth;
    const maxWidth = config.off.text_width

    return data.map(block => {
        let newData: string[] = []
        let blockData = block.split('\r\n')

        blockData.forEach(line => {
            textPxWidth = fonts.getTextWidthPX(
                line,
                config.off.font,
                config.off.textbox.fontSize
            )

            if (textPxWidth + lineBreak > maxWidth) {
                newData.push(...text.lineHalving(line))
            } else {
                newData.push(line)
            }
        })
        return newData.join('\r\n')
    })
}

async function joinedSongsOfflineBufferFromContents(contents: string[]) {
    const pres = joinedSongsOfflineFromContents(contents)
    const buffer = await pres.write({ outputType: 'base64' });
    return Buffer.from(buffer.toString(), 'base64')
}

function joinedSongsOfflineFromContents(contents: string[]) {
    const pres = new PptxGenJS()
    pres.layout = config.off.layout
    pres.theme = { bodyFontFace: config.off.font }

    for (let content of contents) {
        const data = convertContentToOffline(content)

        offlineSlide(pres)

        for (let block of data) {
            offlineSlide(pres, block)
        }

        offlineSlide(pres)
    }
    return pres
}

function getSongOfflinePPTXFromContent(content: string) {
    const pres = new PptxGenJS()
    pres.layout = config.off.layout
    pres.theme = { bodyFontFace: config.off.font }
    const data = convertContentToOffline(content)

    offlineSlide(pres)

    for (let block of data) {
        offlineSlide(pres, block)
    }

    offlineSlide(pres)
    return pres
}

function onlineSlide(pres: PptxGenJS, text = '') {
    const slide = pres.addSlide()
    slide.background = { color: config.on.background }

    if (text !== '') {
        slide.addText(text, {
            y: 0,
            x: 0,
            w: '100%',
            ...config.on.textbox,
        })
    }
    return slide;
}

function convertContentToOnline(content: string) {
    content = content.replaceAll('\r\n\r\n', '\r\n')
    content = text.normalizeWithoutMarks(content)
    let data = content.split('\r\n')
    let newData: string[] = []
    let textPxWidth;
    const lineBreak = config.on.line_break
    const maxWidth = config.on.text_width

    data.forEach(line => {
        textPxWidth = fonts.getTextWidthPX(
            line,
            config.on.font,
            config.on.textbox.fontSize
        )

        if (textPxWidth + lineBreak > maxWidth) {
            newData.push(...text.lineHalving(line))
        } else {
            newData.push(line)
        }
    })
    return newData;
}

function joinedSongsOnlineFromContents(contents: string[]) {
    const pres = new PptxGenJS()
    pres.layout = config.on.layout
    pres.theme = { bodyFontFace: config.on.font }

    for (let content of contents) {
        const data = convertContentToOnline(content)

        onlineSlide(pres)

        for (let line of data) {
            onlineSlide(pres, line)
        }

        onlineSlide(pres)
    }

    return pres
}

function getSongOnlinePPTXFromContent(content: string) {
    const pres = new PptxGenJS()
    pres.layout = config.on.layout
    pres.theme = { bodyFontFace: config.on.font }
    const data = convertContentToOnline(content)

    onlineSlide(pres)

    for (let line of data) {
        onlineSlide(pres, line)
    }

    onlineSlide(pres)
    return pres
}

async function getOnlinePPTXBuffer(content: string): Promise<Buffer> {
    const pres = getSongOnlinePPTXFromContent(content)
    const buffer = await pres.write({ outputType: 'base64' });
    return Buffer.from(buffer.toString(), 'base64') //trick for typescript 
}

async function joinedSongsOnlineBufferFromContents(contents: string[]) {
    const pres = joinedSongsOnlineFromContents(contents)
    const buffer = await pres.write({ outputType: 'nodebuffer' });
    return buffer
}

async function writeSongOnlineInFile(content: string, filePath: string) {
    const pres = getSongOnlinePPTXFromContent(content)
    await pres.writeFile({ fileName: filePath })
}

export {
    setConfigData,
    parsePPTXFromFile,
    parsePPTXFromBuffer,
    getOfflinePPTXBuffer,
    convertContentToOffline,
    convertContentToOnline,
    joinedSongsOfflineBufferFromContents,
    joinedSongsOfflineFromContents,
    joinedSongsOnlineFromContents,
    getOnlinePPTXBuffer,
    joinedSongsOnlineBufferFromContents,
    writeSongOnlineInFile
}