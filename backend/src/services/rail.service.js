import { pool } from "../config/postgres.js";
import Prettify from "../utils/prettify.js";

const prettify = new Prettify();

export const ensureTrainExists = async (train_number) => {
    const existingTrain = await getTrainByNumber(train_number);
    if (existingTrain) {
        console.log("Train already exists:", existingTrain);
        return true;
    }

    const URL_Train = `https://erail.in/rail/getTrains.aspx?TrainNo=${train_number}&DataSource=0&Language=0&Cache=true`;
    let train;
    try {
        const response = await fetch(URL_Train);
        const data = await response.text();
        const json = prettify.CheckTrain(data);
        train = json.data;
        const coaches = json.data.coaches;
        console.log("This is the train data from the api: ", json);
        for (const [coachType, seats] of Object.entries(coaches)) {
            console.log("Coach type:", coachType);
            seats.forEach(seat => {
                console.log(seat);
            });
        }
        console.log("This is the train data from the api: ", json.data.coaches);
    } catch (e) {
        console.error("Error fetching train data:", e);
    }

    const newTrain = await addTrain({
        train_number,
        train_name: train.train_name || "Unknown Train",
        train_type: train.type || "Unknown train",
        operator_zone: "Unknown zone",
        avg_speed: train.average_speed || 0,
        total_distance: train.distance_from_to || 0,

        // "0" = monday
        frequency: {
            0: train.running_days[0] == "1",
            1: train.running_days[1] == "1",
            2: train.running_days[2] == "1",
            3: train.running_days[3] == "1",
            4: train.running_days[4] == "1",
            5: train.running_days[5] == "1",
            6: train.running_days[6] == "1",
        },
        coaches: {},
        routes: {
            from_station: {
                name: train.from_stn_name || "Unknown Station",
                code: train.from_stn_code || "Unknown Code",
                time: train.from_time || "Unknown Time"
            },
            to_station: {
                name: train.to_stn_name || "Unknown Station",
                code: train.to_stn_code || "Unknown Code",
                time: train.to_time || "Unknown Time"
            }
        },
        ticket_prices: {}
    })

    return newTrain ? true : false;
};

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