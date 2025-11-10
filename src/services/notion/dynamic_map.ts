interface Dynamic {
    name: string,
    color: string,
}

interface DynamicMap {
    [key: string]: Dynamic
}

export const dynamicMap: DynamicMap = {
    "повільна/молитовна": {
        "name": "Повільна/молитовна",
        "color": "blue",
    },
    "різдвяна": {
        "name": "Різдвяна",
        "color": "green",
    },
    "середня": {
        "name": "Середня",
        "color": "yellow"
    },
    "бадьора": {
        "name": "Бадьора",
        "color": "red"
    }
}

export const keyboardDynamicMap = Object.fromEntries(
    Object.entries(dynamicMap).map(([key, value]) => ([`"${key}"`, value]))
)

export const keyboardDynamicKeys = Object.values(dynamicMap).map(item => `"${item.name}"`)