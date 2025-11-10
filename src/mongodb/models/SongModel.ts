import { Model, Schema, model } from 'mongoose';

const SongSchema: Schema<ISong> = new Schema({
    song_id: {
        type: String,
        unique: true,
        required: true
    },
    messages: {
        pdf: {
            id: Number,
            fileId: String,
            modifiedTime: String
        },
        online: {
            id: Number,
            fileId: String,
            modifiedTime: String
        },
        docx: {
            id: Number,
            fileId: String,
            modifiedTime: String
        },
        offline: {
            id: Number,
            fileId: String,
            modifiedTime: String
        }
    }
});

const SongModel: Model<ISong> = model<ISong>('Song', SongSchema)

export default SongModel