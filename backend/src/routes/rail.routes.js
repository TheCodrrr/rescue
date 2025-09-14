import { Router } from "express";
import {
  getTrainDetailsHandler,
  getTrainStationsHandler,
  updateTrainStationsHandler,
  searchTrainsByStationHandler,
  updateAllTrainStationsHandler
} from "../controllers/rail.controllers.js";

const router = Router();

// Get basic train details
router.get("/train/:trainNumber", getTrainDetailsHandler);

// Get all stations for a specific train
router.get("/train/:trainNumber/stations", getTrainStationsHandler);

// Update stations for a specific train (fetch fresh data)
router.post("/train/:trainNumber/stations/update", updateTrainStationsHandler);

// Search trains that stop at a specific station
router.get("/station/:stationCode/trains", searchTrainsByStationHandler);

// Admin route to update all trains with missing station data
router.post("/admin/trains/update-stations", updateAllTrainStationsHandler);

export default router;
