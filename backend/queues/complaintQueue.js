import { Queue } from "bullmq";
import dotenv from "dotenv";
dotenv.config();

export const complaintQueue = new Queue("complaint-queue", {
    connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
    }
})