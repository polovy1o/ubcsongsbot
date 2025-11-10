import { STEPS } from "../services/telegram/commands/add/AddCommand.js"
import type CustomCommand from "../services/telegram/commands/CustomCommand.js"
import { store } from "./store.js"

export function setUserCommand(userId: string, command?: CustomCommand | null | undefined) {
    const allData = store.get()

    if (!allData.users[userId]) {
        allData.users[userId] = {}
    }

    allData.users[userId].command = command

    store.set(allData)
}

export function deleteUser(userId: string) {
    const allData = store.get()

    delete allData.users[userId]

    store.set(allData)
}

export function deleteUserCommand(userId: string) {
    const allData = store.get()

    if (allData.users[userId]) {
        allData.users[userId].command = undefined
        store.set(allData)
    }
}

export function updateJoinData(userId: string, data?: string[] | undefined) {
    const allData = store.get()

    if (!allData.users[userId]) return;

    if (!allData.users[userId].data) {
        allData.users[userId].data = {}
    }

    allData.users[userId].data.join = data
    store.set(allData)
}

export function getJoinData(userId: string) {
    return store.get().users[userId]?.data?.join || []
}

export function getCommandData(userId: string) {
    return store.get().users[userId]?.command
}

export function getAddData(userId: string) {
    return store.get().users[userId]?.data?.add
}

export const NEXT_STEP = {
    NO_COMMAND: 0,
    EMPTY_NAME: 1,
    EMPTY_CONTENT: 2,
    MAX: 4,
    SUCCESS: 5
}

export const PREV_STEP = {
    NO_COMMAND: 0,
    MIN: 1,
    SUCCESS: 2
}

export const SKIP_ALL = {
    NO_COMMAND: 0,
    CANT_SKIP: 1,
    ALREADY_LAST: 2,
    SUCCESS: 3
}

export function prevStep(userId: string) {
    const allData = store.get()

    if (!allData.users[userId]) return PREV_STEP.NO_COMMAND;

    if (!allData.users[userId].data?.add) return PREV_STEP.MIN

    if (allData.users[userId].data.add.currentStep === 0) return PREV_STEP.MIN

    --allData.users[userId].data.add.currentStep
    return PREV_STEP.SUCCESS
}

export function nextStep(userId: string, stepData?: string | null) {
    const allData = store.get()

    if (!allData.users[userId]) return NEXT_STEP.NO_COMMAND;

    if (!allData.users[userId].data) {
        allData.users[userId].data = {}
    }

    if (!allData.users[userId].data.add) {
        if (!stepData) return NEXT_STEP.EMPTY_NAME;

        allData.users[userId].data.add = {
            currentStep: 1,
            stepsData: [stepData]
        }
    } else {
        const currentStep = allData.users[userId].data.add.currentStep

        if (currentStep === STEPS.DYNAMIC + 1) {
            return NEXT_STEP.MAX
        }

        const stepsData = allData.users[userId].data.add.stepsData

        if ((currentStep === 1 || currentStep === 0) && ((!stepsData[currentStep] && !stepData) || (stepsData[currentStep] && stepData === null))) {
            return currentStep === 1 ? NEXT_STEP.EMPTY_CONTENT : NEXT_STEP.EMPTY_NAME
        } else {
            ++allData.users[userId].data.add.currentStep
            if (stepData !== undefined) {
                allData.users[userId].data.add.stepsData[currentStep] = stepData
            }
        }
    }

    store.set(allData)
    return NEXT_STEP.SUCCESS
}

export function skipAll(userId: string) {
    const allData = store.get()

    if (!allData.users[userId]) return SKIP_ALL.NO_COMMAND;

    if (!allData.users[userId].data || !allData.users[userId].data.add) return SKIP_ALL.CANT_SKIP

    const currentStep = allData.users[userId].data.add.currentStep

    if (currentStep === STEPS.DYNAMIC + 1) return SKIP_ALL.ALREADY_LAST

    allData.users[userId].data.add.currentStep = STEPS.DYNAMIC + 1
    store.set(allData)
    return SKIP_ALL.SUCCESS
}

export function resetAddDataWithCommand(userId: string) {
    const allData = store.get()

    if (!allData.users[userId]) return

    allData.users[userId].command = undefined
    
    if (allData.users[userId].data?.add) {
        delete allData.users[userId].data.add
    }

    store.set(allData)
}

export function resetUserTextProperty(userId: string, property: keyof UserCommandTextProperties) {
    const allData = store.get()

    if (!allData.users[userId]) return
    
    if (allData.users[userId].data?.textProps && allData.users[userId].data.textProps[property]) {
        delete allData.users[userId].data.textProps[property]
    }

    store.set(allData)
}

export function getUserTextProperty(userId: string, property: keyof UserCommandTextProperties) {
    const userProps = store.get().users[userId]?.data?.textProps
    return userProps ? userProps[property] : undefined
}

export function updateUserTextProperty(userId: string, property: keyof UserCommandTextProperties, data?: string | undefined) {
    const allData = store.get()

    if (!allData.users[userId]) return;

    if (!allData.users[userId].data) {
        allData.users[userId].data = {textProps: {}}
    }

    if (!allData.users[userId].data.textProps) {
        allData.users[userId].data.textProps = {}
    }

    allData.users[userId].data.textProps[property] = data
    store.set(allData)
}