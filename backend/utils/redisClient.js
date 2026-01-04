import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const client = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
    password: process.env.REDIS_PASSWORD,
});

client.on("error", (err) => console.error("Redis error:", err));

await client.connect();
// console.log("Connected to Redis client");

export default client;