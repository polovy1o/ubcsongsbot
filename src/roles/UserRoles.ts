import dotenv from 'dotenv'
import loadEnv from '../loadenv.js'
import type { Types } from 'mongoose';
import { createUser, deleteUser, exists, getAllUsers, getUser, updateUserRole } from '../mongodb/UserRolesDB.js';
import startCommand from '../services/telegram/commands/StartCommand.js';
import { bot } from '../services/telegram/bot.js';
import { deleteUser as deleteUserBotUsingData } from '../state/functions.js';

loadEnv(dotenv)

type UserRoleData = UserInfo & { _id: Types.ObjectId; }

interface UsersRoleData {
    [tg_id: string]: UserRoleData
}

class UserRoles {
    owner_id: string;
    users: UsersRoleData;

    constructor() {
        this.owner_id = process.env.TELEGRAM_OWNER_ID || ''
        this.users = {}
    }

    async start() {
        const res = await getAllUsers()
        this.users = {}
        res.forEach(user => {
            this.users[user.tg_id] = user
        })
    }

    async reload() {
        const oldUsers = this.users
        const res = await getAllUsers()
        this.users = {}
        res.forEach(user => {
            this.users[user.tg_id] = user
        })

        const copyUsers = {...this.users}

        for (let user of Object.values(oldUsers)) {
            const userId = user.tg_id

            if (!this.users[userId] || this.users[userId].role !== user.role) {
                deleteUserBotUsingData(userId)
                startCommand.sendKeyboard(bot, userId)
            }
            
            delete copyUsers[userId]
        }

        for (let userId of Object.keys(copyUsers)) {
            startCommand.sendKeyboard(bot, userId)
        }
    }

    isOwner(tg_id: string) {
        return tg_id === this.owner_id
    }

    getUser(tg_id: string): UserRoleData | undefined {
        return this.users[tg_id]
    }

    getUserRole(tg_id: string): string | undefined {
        return this.users[tg_id]?.role
    }

    exists(tg_id: string) {
        return this.users[tg_id] !== undefined
    }

    getAllUsers() {
        return this.users
    }

    async updateUserRole(tg_id: string, role: string): Promise<UserRoleData | null> {
        const res = await updateUserRole(tg_id, role)
        await this.reload()
        return res
    }

    async deleteUser(tg_id: string) {
        const res = await deleteUser(tg_id)
        await this.reload()
        return res
    }

    async addUser(data: UserInfo) {
        const res = await createUser(data)
        await this.reload()
        return res
    }
}

const roles = new UserRoles()

export default roles