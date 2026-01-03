import { Router } from "express";
import { getComplaintAnalytics } from "../controllers/analytics.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Protected routes - requires authentication
router.route("/detail").get(verifyJWT, getComplaintAnalytics);

export default router;
