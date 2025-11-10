interface Tempo {
    name: string,
    color: string
}

interface TempoMap {
    [key: string]: Tempo
}

export const tempoMap: TempoMap = {
    "70bpm": {
        "name": "70bpm",
        "color": "blue"
    },
    "74bpm": {
        "name": "74bpm",
        "color": "gray"
    },
    "75bpm": {
        "name": "74bpm",
        "color": "green"
    },
    "95bpm": {
        "name": "95bpm",
        "color": "pink"
    },
    "127bpm": {
        "name": "127bpm",
        "color": "brown"
    },
    "помірний": {
        "name": "Помірний",
        "color": "default"
    },
    "повільний": {
        "name": "Повільний",
        "color": "purple"
    },
    "швидкий": {
        "name": "Швидкий",
        "color": "yellow"
    }
}

export const keyboardTempoMap = Object.fromEntries(
    Object.entries(tempoMap).map(([key, value]) => ([`"${key}"`, value]))
)

export const keyboardTempoKeys = Object.values(tempoMap).map(item => `"${item.name}"`)