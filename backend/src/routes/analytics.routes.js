import { Router } from "express";
import { getNearbyAnalytics } from "../controllers/analytics.controllers.js";
import { getComplaintAnalytics } from "../controllers/complaint.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Protected routes - requires authentication
router.route("/nearby").get(verifyJWT, getNearbyAnalytics);
router.route("/category").get(verifyJWT, getComplaintAnalytics);

export default router;
