import { map } from "nanostores";
import type CustomCommand from "../services/telegram/commands/CustomCommand";

interface UserCommandData {
    data?: UserCommandDataProperties,
    command?: CustomCommand | null | undefined
}

interface UserState {
    [key: string]: UserCommandData | null | undefined
}

interface AppStore {
    users: UserState
}

export const store = map<AppStore>({
    users: {}
})
