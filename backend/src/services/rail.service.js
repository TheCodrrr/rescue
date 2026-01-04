import { pool } from "../config/postgres.js";
import Prettify from "../utils/prettify.js";

const prettify = new Prettify();

// Function to fetch all stations a train stops at
export const fetchTrainStations = async (train_number) => {
  try {
    // First get train details to get train_id
    const URL_Train = `https://erail.in/rail/getTrains.aspx?TrainNo=${train_number}&DataSource=0&Language=0&Cache=true`;
    let response = await fetch(URL_Train);
    let data = await response.text();
    let json = prettify.CheckTrain(data);
    
    if (!json.success) {
      throw new Error("Failed to get train details");
    }

    const train_id = json.data.train_id;
    
    // Now fetch the route/stations
    const URL_Route = `https://erail.in/data.aspx?Action=TRAINROUTE&Password=2012&Data1=${train_id}&Data2=0&Cache=true`;
    response = await fetch(URL_Route);
    data = await response.text();
    json = prettify.GetRoute(data);
    
    if (json.success) {
      return json.data; // Array of stations with details
    }
    
    return [];
  } catch (error) {
    console.error("❌ Error fetching train stations:", error);
    return [];
  }
};

export const ensureTrainExists = async (train_number) => {
    const existingTrain = await getTrainByNumber(train_number);
    if (existingTrain) {
        // console.log("Train already exists:", existingTrain);
        
        // Check if stations data exists, if not, fetch and update
        if (!existingTrain.stations || existingTrain.stations.length === 0) {
            // console.log("Train exists but no stations data, updating...");
            await updateTrainStations(train_number);
        }
        
        return true;
    }

    return await ensureTrainExistsWithoutStationCheck(train_number);
};

// Helper function to create train without station check to avoid infinite loop
export const ensureTrainExistsWithoutStationCheck = async (train_number) => {
    const URL_Train = `https://erail.in/rail/getTrains.aspx?TrainNo=${train_number}&DataSource=0&Language=0&Cache=true`;
    let train;
    try {
        const response = await fetch(URL_Train);
        const data = await response.text();
        const json = prettify.CheckTrain(data);
        
        if (!json || !json.success) {
            console.error("Failed to fetch train data:", json);
            return false;
        }
        
        train = json.data;
        // console.log("Train data fetched successfully for:", train_number);
        
        // Safely handle coaches data
        const coaches = train.coaches || {};
        // console.log("Coaches data:", Object.keys(coaches).length, "coach types");
        
    } catch (e) {
        console.error("Error fetching train data:", e);
        return false;
    }

    // Fetch all stations the train stops at
    const stations = await fetchTrainStations(train_number);
    // console.log(`Fetched ${stations.length} stations for train ${train_number}`);

    const newTrain = await addTrain({
        train_number,
        train_name: train.train_name || "Unknown Train",
        train_type: train.type || "Unknown train",
        operator_zone: "Unknown zone",
        avg_speed: train.average_speed || 0,
        total_distance: train.distance_from_to || 0,

        // "0" = monday
        frequency: {
            0: train.running_days ? (train.running_days[0] == "1") : false,
            1: train.running_days ? (train.running_days[1] == "1") : false,
            2: train.running_days ? (train.running_days[2] == "1") : false,
            3: train.running_days ? (train.running_days[3] == "1") : false,
            4: train.running_days ? (train.running_days[4] == "1") : false,
            5: train.running_days ? (train.running_days[5] == "1") : false,
            6: train.running_days ? (train.running_days[6] == "1") : false,
        },
        coaches: train.coaches || {},
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
        ticket_prices: {},
        stations: stations
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
        ticket_prices JSONB,
        stations JSONB
      )
    `);

    // Add stations column if it doesn't exist
    await pool.query(`
      ALTER TABLE trains 
      ADD COLUMN IF NOT EXISTS stations JSONB;
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
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trains_stations ON trains USING GIN (stations);
    `);

    // console.log("✅ Rail schema initialized");
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
    stations,
  } = train;

  try {
    const query = `
      INSERT INTO trains (
        train_number, train_name, train_type, operator_zone, avg_speed, total_distance,
        frequency, coaches, routes, ticket_prices, stations
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (train_number) DO UPDATE SET
        train_name = EXCLUDED.train_name,
        train_type = EXCLUDED.train_type,
        operator_zone = EXCLUDED.operator_zone,
        avg_speed = EXCLUDED.avg_speed,
        total_distance = EXCLUDED.total_distance,
        frequency = EXCLUDED.frequency,
        coaches = EXCLUDED.coaches,
        routes = EXCLUDED.routes,
        ticket_prices = EXCLUDED.ticket_prices,
        stations = EXCLUDED.stations
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
      JSON.stringify(stations || []),
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
    // Search in both the routes (from/to stations) and the stations array
    const result = await pool.query(
      `SELECT * FROM trains 
       WHERE routes @> $1::jsonb 
       OR stations @> $2::jsonb`,
      [
        JSON.stringify([{ station_code }]),
        JSON.stringify([{ source_stn_code: station_code }])
      ]
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

// Function to update stations for an existing train
export const updateTrainStations = async (train_number) => {
  try {
    // Check if train exists in database first
    const existingTrain = await getTrainByNumber(train_number);
    if (!existingTrain) {
      // If train doesn't exist, create it first
      // console.log(`Train ${train_number} not found in database, creating it...`);
      const created = await ensureTrainExistsWithoutStationCheck(train_number);
      if (!created) {
        throw new Error(`Failed to create train ${train_number}`);
      }
    }
    
    // console.log(`Fetching stations for train ${train_number}...`);
    const stations = await fetchTrainStations(train_number);
    // console.log(`Fetched ${stations.length} stations for train ${train_number}`);
    
    // Ensure stations is a valid array
    const validStations = Array.isArray(stations) ? stations : [];
    
    // console.log(`Updating database with stations data...`);
    const result = await pool.query(
      `UPDATE trains SET stations = $1 WHERE train_number = $2 RETURNING *`,
      [JSON.stringify(validStations), train_number]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Train ${train_number} not found in database after creation attempt`);
    }
    
    // console.log(`✅ Updated stations for train ${train_number}`);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error updating train stations:", error);
    throw error;
  }
};

// Function to get train stations
export const getTrainStations = async (train_number) => {
  try {
    const result = await pool.query(
      `SELECT stations FROM trains WHERE train_number = $1`,
      [train_number]
    );
    if (result.rows[0] && result.rows[0].stations) {
      return result.rows[0].stations;
    }
    return [];
  } catch (error) {
    console.error("❌ Error fetching train stations:", error);
    throw error;
  }
};

// Function to get all trains and update their stations if they don't have any
export const updateAllTrainStations = async () => {
  try {
    // Get all trains that don't have stations data or have empty stations
    const result = await pool.query(
      `SELECT train_number FROM trains WHERE stations IS NULL OR stations = '[]'::jsonb`
    );
    
    const trainsToUpdate = result.rows;
    // console.log(`🔄 Found ${trainsToUpdate.length} trains without station data`);
    
    for (const train of trainsToUpdate) {
      try {
        // console.log(`🔄 Updating stations for train ${train.train_number}...`);
        await updateTrainStations(train.train_number);
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to update stations for train ${train.train_number}:`, error.message);
      }
    }
    
    // console.log("✅ Completed updating train stations");
  } catch (error) {
    console.error("❌ Error updating all train stations:", error);
    throw error;
  }
};