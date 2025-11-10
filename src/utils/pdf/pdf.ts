import path from "path";
import PdfPrinter from "pdfmake";
import type { Content } from "pdfmake/interfaces";
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

const printer: PdfPrinter = new PdfPrinter({
    Roboto: {
        normal: path.join(__dirname, '../../../data/fonts/Roboto/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../../../data/fonts/Roboto/Roboto-Bold.ttf'),
        italics: path.join(__dirname, '../../../data/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics:path.join(__dirname, '../../../data/fonts/Roboto/Roboto-BoldItalic.ttf'),
    }
})

async function createPdfBuffer(title: string, content: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const pdfDoc = printer.createPdfKitDocument({
            styles: {
                header: {
                    fontSize: 16,
                    bold: true
                },
                bigger: {
                    fontSize: 14,
                }
            },
            content: [
                {
                    style: 'header',
                    text: title,
                    marginBottom: 16
                },
                {
                    style: 'bigger',
                    text: content
                }
            ]
        })
        const chunks: Uint8Array[] = [];

        pdfDoc.on('data', (chunk: Uint8Array) => {
            chunks.push(chunk);
        });
        pdfDoc.on('end', () => {
            const pdfBuffer: Buffer = Buffer.concat(chunks);
            resolve(pdfBuffer)
        });

        pdfDoc.end();
    })
}

async function createPdfBufferFromMany(songsData: PdfSong[]): Promise<Buffer> {
    const content: Content = [];

    for (let i = 0; i < songsData.length - 1; ++i) {

        content.push(
            {
                style: 'header',
                text: songsData[i].title,
                marginBottom: 16
            },
            {
                style: 'bigger',
                text: songsData[i].content,
                marginBottom: 34
            }
        )
    }

    content.push(
        {
            style: 'header',
            text: songsData[songsData.length - 1].title,
            marginBottom: 16
        },
        {
            style: 'bigger',
            text: songsData[songsData.length - 1].content
        }
    )

    return new Promise((resolve, reject) => {
        const pdfDoc = printer.createPdfKitDocument({
            styles: {
                header: {
                    fontSize: 16,
                    bold: true
                },
                bigger: {
                    fontSize: 14,
                }
            },
            content
        })
        const chunks: Uint8Array[] = [];

        pdfDoc.on('data', (chunk: Uint8Array) => {
            chunks.push(chunk);
        });
        pdfDoc.on('end', () => {
            const pdfBuffer: Buffer = Buffer.concat(chunks);
            resolve(pdfBuffer)
        });

        pdfDoc.end();
    })
}

export {
    createPdfBuffer,
    createPdfBufferFromMany
};
