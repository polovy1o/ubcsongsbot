import { Model, Schema, model } from 'mongoose';

const UserRolesScheme: Schema<UserInfo> = new Schema({
    tg_id: {
        type: String,
        unique: true,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: false
    },
});

const UserRolesModel: Model<UserInfo> = model<UserInfo>('UserRoles', UserRolesScheme)

export default UserRolesModel