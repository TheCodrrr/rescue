import { verifyJWT } from "../middlewares/auth.middlewares.js";
import express from "express";
import { 
    getNearbyComplaintsForOfficer,
    rejectComplaint
} from "../controllers/officer.controllers.js";

const router = express.Router();

// Route to get nearby complaints for officers (filtered by rejected complaints)
router.get("/nearby-complaints", verifyJWT, getNearbyComplaintsForOfficer);

// Route to reject a complaint (add to Redis)
router.post("/reject-complaint", verifyJWT, rejectComplaint);

export default router;