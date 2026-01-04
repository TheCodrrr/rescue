import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // use the full Render URL
  ssl: { rejectUnauthorized: false }          // required for Render managed DB
});

pool.connect()
  .then(client => {
    // console.log("Connected to PostgreSQL");
    client.release();
  })
  .catch(err => console.error("PostgreSQL connection error: ", err));

process.on("SIGINT", async () => {
  await pool.end();
  // console.log("PostgreSQL pool closed");
  process.exit(0);
});
