import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
    user: process.env.PG_USER || "postgres",
    host: process.env.PG_HOST || "localhost",
    database: process.env.PG_DATABASE || "rescue_management",
    password: process.env.PG_PASSWORD || "",
    port: process.env.PG_PORT || 5432,
})

pool.connect()
    .then(client => {
        // console.log("Connected to postgresql");
        client.release();
    })
    .catch(err => console.error("PostgreSQL connection error: ", err));

process.on("SIGINT", async () => {
    await pool.end();
    // console.log("PostgreSQL pool closed");
    process.exit(0);
})