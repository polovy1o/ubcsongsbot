import { Document, FileChild, Packer, Paragraph, TextRun } from 'docx'
import dconfig from './config.json' with { type: "json" };

let config = JSON.parse(JSON.stringify(dconfig))

function setConfigData(data: object) {
    config = data
}

function newParagraph(text: string = ''): Paragraph {
    return new Paragraph({
        children: [
            new TextRun(text)
        ]
    })
}

async function createDOCXBufferSongFromMany(songsData: DOCXSong[]): Promise<Buffer> {
    const gaps = (new Array(config.title_gaps + 1)).fill(newParagraph())
    const docData: FileChild[] = [];
    
    songsData.forEach(({title, content}, i)  => {
        docData.push(...createDOCXSongData(title, content))
        
        if (i < songsData.length - 1) {
            docData.push(...gaps)
        }
    })

    return createDOCXBuffer(docData)
}

async function createDOCXBufferSong(title: string, content: string): Promise<Buffer> {
    return createDOCXBuffer(createDOCXSongData(title, content))
}

function createDOCXSongData(title: string, content: string): FileChild[] {
    return [
        new Paragraph({
            children: [
                new TextRun({
                    text: title,
                    ...config.title_style
                })
            ]
        }),
        ...(new Array(config.title_gaps)).fill(newParagraph()),
        ...(content.split('\r\n').map(line => newParagraph(line))),
    ]
}

async function createDOCXBuffer(docData: FileChild[]): Promise<Buffer>
{
    const doc = new Document({
        styles: config.general_styles,
        sections: [{
            properties: config.section_props,
            children: docData
        }]
    })

    return Packer.toBuffer(doc)
}

export {
    setConfigData,
    createDOCXBufferSong,
    createDOCXBufferSongFromMany
}