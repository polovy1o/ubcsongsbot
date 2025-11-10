import type { Types } from "mongoose";
import UserRolesModel from "./models/UserRolesModel.js";

type UserRoleData = UserInfo & { _id: Types.ObjectId; }

async function exists(tg_id: string) {
    const res = await UserRolesModel.exists({ tg_id })
    return res !== null
}

async function getUser(tg_id: string): Promise<UserRoleData | null> {
    const res = await UserRolesModel.findOne({tg_id})
    return res ? res.toObject<UserInfo>({versionKey: false}) : null
}

async function getAllUsers(): Promise<UserRoleData[]> {
    const res = await UserRolesModel.find()
    return res.map(doc => (
        doc.toObject<UserInfo>({versionKey: false})
    ))
}

async function createUser(data: UserInfo): Promise<UserRoleData | null> {
    if (await exists(data.tg_id)) {
        return null;
    }

    const res = await UserRolesModel.create(data);
    return res.toObject<UserInfo>({versionKey: false})
}

async function updateUserRole(tg_id: string, role: string): Promise<UserRoleData | null> {
    const res = await UserRolesModel.findOneAndUpdate({tg_id}, {role})
    return res ? res.toObject<UserInfo>({versionKey: false}) : null
}

async function deleteUser(tg_id: string): Promise<UserRoleData | null> {
    const res = await UserRolesModel.findOneAndDelete({tg_id})
    return res ? res.toObject<UserInfo>({versionKey: false}) : null
}

export {
    exists,
    getUser,
    getAllUsers,
    createUser,
    updateUserRole,
    deleteUser
}