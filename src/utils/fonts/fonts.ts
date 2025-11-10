import path from 'path';
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import * as fontkit from 'fontkit'

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

type Font = fontkit.Font
type FCollection = fontkit.FontCollection

interface Fonts {
    [key: string]: Font
}

const fonts: Fonts = {}

async function loadFonts(): Promise<void>
{
    const files = await fs.readdir(path.join(__dirname, '../../../data/fonts'));

    for (let filename of files) {
        const { base, ext, name } = path.parse(filename)

        if (ext === '.ttf' || ext === '.otf') {
            const res: Font | FCollection = await fontkit.open(path.join(__dirname, '../../../data/fonts', base))
            
            if ('fonts' in res) {
                for (let font of res.fonts) {
                    fonts[font.fullName] = font
                }
            } else {
                fonts[name] = res
            }
        }
    }
}

//async function addNewFont

function getTextWidthPX(text: string, fontName: string, pt: number = 48): number
{
    if (!fonts[fontName]) return -1;

    const run = fonts[fontName].layout(text);
    const coff = 64 * 24 / pt;

    return run.glyphs.reduce((accum, { advanceWidth }) => accum + (advanceWidth / coff), 0)
}

export default {
    loadFonts,
    getTextWidthPX
}