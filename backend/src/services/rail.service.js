import { pool } from "../config/postgres.js";

export const initRailSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trains (
        train_number VARCHAR(10) PRIMARY KEY,
        train_name TEXT NOT NULL,
        train_type VARCHAR(50),
        operator_zone VARCHAR(50),
        avg_speed INT,
        total_distance INT,
        frequency JSONB,
        coaches JSONB,
        routes JSONB,
        ticket_prices JSONB
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stations (
        station_code VARCHAR(10) PRIMARY KEY,
        station_name TEXT NOT NULL,
        zone VARCHAR(50)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trains_frequency ON trains USING GIN (frequency);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trains_coaches ON trains USING GIN (coaches);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trains_routes ON trains USING GIN (routes);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trains_ticket_prices ON trains USING GIN (ticket_prices jsonb_path_ops);
    `);

    console.log("✅ Rail schema initialized");
  } catch (err) {
    console.error("❌ Error initializing schema:", err);
  }
};

export const addTrain = async (train) => {
  const {
    train_number,
    train_name,
    train_type,
    operator_zone,
    avg_speed,
    total_distance,
    frequency,
    coaches,
    routes,
    ticket_prices,
  } = train;

  try {
    const query = `
      INSERT INTO trains (
        train_number, train_name, train_type, operator_zone, avg_speed, total_distance,
        frequency, coaches, routes, ticket_prices
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (train_number) DO UPDATE SET
        train_name = EXCLUDED.train_name,
        train_type = EXCLUDED.train_type,
        operator_zone = EXCLUDED.operator_zone,
        avg_speed = EXCLUDED.avg_speed,
        total_distance = EXCLUDED.total_distance,
        frequency = EXCLUDED.frequency,
        coaches = EXCLUDED.coaches,
        routes = EXCLUDED.routes,
        ticket_prices = EXCLUDED.ticket_prices
      RETURNING *;
    `;

    const values = [
      train_number,
      train_name,
      train_type,
      operator_zone,
      avg_speed,
      total_distance,
      JSON.stringify(frequency),
      JSON.stringify(coaches),
      JSON.stringify(routes),
      JSON.stringify(ticket_prices),
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error adding train:", error);
    throw error;
  }
};

export const getTrainByNumber = async (train_number) => {
  try {
    const result = await pool.query(
      `SELECT * FROM trains WHERE train_number = $1`,
      [train_number]
    );
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error fetching train:", error);
    throw error;
  }
};

export const searchTrainByStation = async (station_code) => {
  try {
    const result = await pool.query(
      `SELECT * FROM trains WHERE routes @> $1::jsonb`,
      [JSON.stringify([{ station_code }])]
    );
    return result.rows;
  } catch (error) {
    console.error("❌ Error searching trains by station:", error);
    throw error;
  }
};

export const addStation = async (station) => {
  const { station_code, station_name, zone } = station;
  try {
    const result = await pool.query(
      `INSERT INTO stations (station_code, station_name, zone)
       VALUES ($1, $2, $3)
       ON CONFLICT (station_code) DO UPDATE
       SET station_name = EXCLUDED.station_name,
           zone = EXCLUDED.zone
       RETURNING *`,
      [station_code, station_name, zone]
    );
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error adding station:", error);
    throw error;
  }
};

export const getStationByCode = async (station_code) => {
  try {
    const result = await pool.query(
      `SELECT * FROM stations WHERE station_code = $1`,
      [station_code]
    );
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error fetching station:", error);
    throw error;
  }
};