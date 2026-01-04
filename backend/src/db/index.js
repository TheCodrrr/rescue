import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/lodge`);

        // console.log(`\nMongo DB connected successfully: ${connectionInstance.connection.host}`);
    } catch (error) {
        // console.log(`DB connection error: ${error}`);
        process.exit(1);
    }
}

export default connectDB;