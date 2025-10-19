import { Router } from "express";
import { getNearbyAnalytics } from "../controllers/analytics.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Protected route - requires authentication
router.route("/nearby").get(verifyJWT, getNearbyAnalytics);

export default router;
