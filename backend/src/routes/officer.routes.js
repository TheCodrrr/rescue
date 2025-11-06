import { verifyJWT } from "../middlewares/auth.middlewares.js";
import express from "express";
import { getNearbyComplaintsForOfficer } from "../controllers/officer.controllers.js";

const router = express.Router();

// Route to get nearby complaints for officers
router.get("/nearby-complaints", verifyJWT, getNearbyComplaintsForOfficer);

export default router;