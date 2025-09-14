// Additional route handlers that can be added to your existing routes
// You can integrate these into your existing route files

import { 
  fetchTrainStations, 
  getTrainStations, 
  updateTrainStations, 
  updateAllTrainStations,
  searchTrainByStation,
  getTrainByNumber,
  ensureTrainExists
} from "../services/rail.service.js";

// Get basic train details
export const getTrainDetailsHandler = async (req, res) => {
  try {
    const { trainNumber } = req.params;
    
    // Ensure train exists in database
    await ensureTrainExists(trainNumber);
    
    // Get train details from database
    const train = await getTrainByNumber(trainNumber);
    
    if (!train) {
      return res.status(404).json({
        success: false,
        timestamp: Date.now(),
        error: "Train not found"
      });
    }
    
    res.json({
      success: true,
      timestamp: Date.now(),
      data: train
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error.message
    });
  }
};

// Get all stations for a specific train
export const getTrainStationsHandler = async (req, res) => {
  try {
    const { trainNumber } = req.params;
    const stations = await getTrainStations(trainNumber);
    
    res.json({
      success: true,
      timestamp: Date.now(),
      data: {
        train_number: trainNumber,
        total_stations: stations.length,
        stations: stations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error.message
    });
  }
};

// Update stations for a specific train (fetch fresh data from API)
export const updateTrainStationsHandler = async (req, res) => {
  try {
    const { trainNumber } = req.params;
    const updatedTrain = await updateTrainStations(trainNumber);
    
    if (!updatedTrain) {
      return res.status(404).json({
        success: false,
        timestamp: Date.now(),
        error: "Train not found or could not be updated"
      });
    }
    
    // Handle stations data - it might be a string or already parsed
    let stationsData = [];
    if (updatedTrain.stations) {
      try {
        stationsData = typeof updatedTrain.stations === 'string' 
          ? JSON.parse(updatedTrain.stations) 
          : updatedTrain.stations;
      } catch (parseError) {
        console.error("Error parsing stations data:", parseError);
        stationsData = [];
      }
    }
    
    res.json({
      success: true,
      timestamp: Date.now(),
      message: `Stations updated for train ${trainNumber}`,
      data: {
        train_number: trainNumber,
        total_stations: stationsData.length,
        stations: stationsData
      }
    });
  } catch (error) {
    console.error("Error in updateTrainStationsHandler:", error);
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error.message
    });
  }
};

// Search trains by station code
export const searchTrainsByStationHandler = async (req, res) => {
  try {
    const { stationCode } = req.params;
    const trains = await searchTrainByStation(stationCode);
    
    res.json({
      success: true,
      timestamp: Date.now(),
      data: {
        station_code: stationCode,
        total_trains: trains.length,
        trains: trains.map(train => ({
          train_number: train.train_number,
          train_name: train.train_name,
          train_type: train.train_type,
          from_station: train.routes?.from_station,
          to_station: train.routes?.to_station,
          stations_count: train.stations ? train.stations.length : 0
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error.message
    });
  }
};

// Update all trains with missing station data (admin function)
export const updateAllTrainStationsHandler = async (req, res) => {
  try {
    await updateAllTrainStations();
    
    res.json({
      success: true,
      timestamp: Date.now(),
      message: "Started updating all trains with missing station data"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error.message
    });
  }
};
