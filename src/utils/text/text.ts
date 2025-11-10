import genrm from './general_replace_map.json' with { type: "json" };
import nmrm from './nm_replace_map.json' with { type: "json" };
import dconfig from './config.json' with { type: "json" };
import fonts from '../fonts/fonts.js'

let gen_replace_map = JSON.parse(JSON.stringify(genrm))
let nm_replace_map = JSON.parse(JSON.stringify(nmrm))

let config = JSON.parse(JSON.stringify(dconfig))

function setGenReplaceMap(data: any) {
    gen_replace_map = data;
}

function setNMReplaceMap(data: any) {
    nm_replace_map = data;
}

function setConfigData(data: any) {
    config = data
}

function getTextNumber(number: number): string {
    if (number > 9999 || number < 1) return '';
    if (number > 999) return String(number);
    if (number > 99) return '0' + number;
    if (number > 9) return '00' + number;
    return '000' + number;
}

function normalizeWithoutMarks(content: string): string {
    return content.replace(/[^а-яА-ЯїЇҐґЄєіІ̆\r\n' ̈]/g, (match) => {
        let cc: number = match.charCodeAt(0);
        return nm_replace_map[cc] ? nm_replace_map[cc] : ''
    }).replaceAll('  ', ' ')
}

function clearLastMark(line: string) {
    return line.replace(/[\.]$/, '').trim()
}

function clearLastMarkForLastLine(line: string) {
    return line.replace(/[\-—–:,.]$/, '').trim()
}

function capitalize(line: string) {
    return line.charAt(0).toUpperCase() + line.slice(1)
}

/*

    PRO PRESENTER

*/

function lineHalving(line: string): string[] {
    let words = line.split(' ')
    let centerWord = Math.ceil((words.length - 1) / 2)
    let line1 = words.slice(0, centerWord).join(' ').trim()
    let line2 = words.slice(centerWord).join(' ').trim()

    return [line1, capitalize(line2)]
}

function lineHalvingBySep(line: string, sep: string): string[] {
    const sepI = line.indexOf(sep)
    return lineHalvingByI(line, sepI, sep.length)
}

function lineHalvingByI(line: string, sepI: number, sepLen: number = 1): string[] {
    const maxI = line.length - 1.0;

    if (sepI == -1) {
        return [line.trim()]
    }

    if (sepI == maxI) {
        return [line.trim()]
    }

    const line2 = line.slice(sepI + sepLen).trim()
    const line1 = line.slice(0, sepI + 1).trim()

    return [line1, capitalize(line2)]
}

function breakBrokeLines(line1: string, line2: string) {
    const ppf = config.font
    const ppfs = config.fontSize
    const pxForBreak = config.text_width;

    const isBreak1 = fonts.getTextWidthPX(line1, ppf, ppfs) > pxForBreak
    const isBreak2 = fonts.getTextWidthPX(line2, ppf, ppfs) > pxForBreak

    const lines = []

    if (isBreak1 && isBreak2) {
        lines.push(lineHalving(line1), lineHalving(line2))
    } else if (isBreak1) {
        lines.push(lineHalving(line1), [line2])
    } else if (isBreak2) {
        lines.push([line1], lineHalving(line2))
    } else {
        lines.push([line1, line2])
    }

    return lines
}

function proPresenterLineBreak(line: string): string[][] {
    if (config.is_upper) {
        line = line.toUpperCase()
    }

    const ppf = config.font
    const ppfs = config.fontSize
    let seps = [':', '!', '?', '...', '..', '.']

    for (let sep of seps) {
        let sepLines = lineHalvingBySep(line, sep)
        if (sepLines.length == 2) {
            return breakBrokeLines(sepLines[0], sepLines[1]);
        }
    }

    const linePxLength = fonts.getTextWidthPX(line, ppf, ppfs)
    const pxForBreak = config.text_width;

    if (linePxLength < pxForBreak) {
        return [[line]]
    }

    let maxI = line.length - 1.0
    let centerI = Math.round(maxI / 2.0);
    let closest = -1, currDiff = maxI;
    let matches = line.matchAll(/[,\-–]/g)

    for (let m of matches) {
        if (m.index == maxI) continue;

        let diff = Math.abs(centerI - m.index)

        if (diff < currDiff) {
            currDiff = diff;
            closest = m.index;
        }
    }

    let line1, line2

    if (closest < 3 || (maxI - closest) < 4) { //do smarter???
        [line1, line2] = lineHalving(line)
    } else {
        [line1, line2] = lineHalvingByI(line, closest)
    }

    return breakBrokeLines(line1, line2);
}

function normalizeProPresenterBlocks(blocks: string[][][]): string[][] {
    let pairs = []

    for (let block of blocks) {
        let preLine = null;

        for (let pair of block) {
            if (pair.length == 2) {
                if (preLine) {
                    pairs.push([clearLastMarkForLastLine(preLine)])
                    preLine = null
                }
                pairs.push([clearLastMark(pair[0]), clearLastMarkForLastLine(pair[1])])
            } else if (preLine) {
                pairs.push([clearLastMark(preLine), clearLastMarkForLastLine(pair[0])])
                preLine = null;
            } else {
                preLine = pair[0]
            }
        }

        if (preLine) {
            pairs.push([clearLastMarkForLastLine(preLine)])
        }
    }

    return pairs;
}

function parseContentForProPresenter(content: string) {
    const parsedContent = parseSongContent(content)
    const data = parsedContent.map(lines => {
        let slides = []

        for (let line of lines) {
            let lineBreak = proPresenterLineBreak(line)
            slides.push(...lineBreak)
        }
        return slides;
    })
    return normalizeProPresenterBlocks(data);
}

function convertContentToProPresenter(content: string): string {
    const data = parseContentForProPresenter(content)
    return data.map(lines => lines.join('\r\n')).join('\r\n\r\n')
}

function convertToPPWithoutMarks(content: string) {
    return convertContentToProPresenter(normalizeWithoutMarks(content))
}

/*

    CONTENT

*/

function parseSongContent(content: string): string[][] {
    return content.split('\r\n\r\n').map(block => block.split('\r\n'))
}

function normalizeSongContent(content: string) {
    const symbols: SymbolsData = {}
    content = content.replaceAll('  ', ' ')
    content = content.replaceAll('Й', 'Й')
    content = content.replaceAll('й', 'й')
    content = content.replaceAll('ї|ï', 'ї')
    content = content.replaceAll('Ï|Ї', 'Ї')
    content = content.replace(/[^а-яА-ЯїЇҐґЄєіІ.,̈\-̆\r\n!?–…'":; ]/g, (match, i) => {
        let cc = match.charCodeAt(0)

        if (gen_replace_map[cc] !== undefined) {
            return gen_replace_map[cc]
        }

        if (!symbols[cc]) {
            symbols[cc] = { symbol: match, ii: [] }
        }

        symbols[cc].ii.push({ curr: i, preSymbol: content[i - 1] })
        return '';
    })

    content = content.replace(/ ([.,!?…:;'\r;])/g, '$1')
    content = content.replaceAll('\n ', '\n')
    content = content.replace(/([,!?:])([^ \r])/g, '$1 $2')
    return { content, symbols }
}

export {
    getTextNumber,
    setConfigData,
    setGenReplaceMap,
    setNMReplaceMap,
    normalizeWithoutMarks,
    parseSongContent,
    convertContentToProPresenter,
    convertToPPWithoutMarks,
    parseContentForProPresenter,
    lineHalving,
    lineHalvingByI,
    lineHalvingBySep,
    normalizeSongContent
}