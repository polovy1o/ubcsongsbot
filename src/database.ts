import 'dotenv/config'
import mongoose from "mongoose";
import roles from './roles/UserRoles.js';

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(process.env.MONGO_URI || '').then(() => {
            roles.start()
        });
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}
