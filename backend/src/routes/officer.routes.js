import { verifyJWT } from "../middlewares/auth.middlewares.js";
import express from "express";
import { 
    assignOfficerToComplaint,
    getNearbyComplaintsForOfficer,
    rejectComplaint,
    getOfficerAcceptedComplaints,
    getOfficersByCategory,
    resolveComplaint
} from "../controllers/officer.controllers.js";

const router = express.Router();

// Route to get nearby complaints for officers (filtered by rejected complaints)
router.get("/nearby-complaints", verifyJWT, getNearbyComplaintsForOfficer);

// Route to resolve a complaint (officer must be handling it & status must be in_progress)
router.put("/resolve-complaint/:id", verifyJWT, resolveComplaint);

// Route to reject a complaint (add to Redis)
router.post("/reject-complaint", verifyJWT, rejectComplaint);

// Route to assign a complaint
router.put("/:officerId/assign-complaint/:complaintId", assignOfficerToComplaint);

// Route to get complaints accepted by the officer
router.get("/accepted-complaints", verifyJWT, getOfficerAcceptedComplaints);

router.get("/:category", verifyJWT, getOfficersByCategory);

export default router;