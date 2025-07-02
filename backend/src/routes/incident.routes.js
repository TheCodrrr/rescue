import express from "express";
import { deleteIncident, downvoteIncident, getAllIncidents, reportIncident, updateIncidentStatus, updateIncidentVerification, upvoteIncident } from "../controllers/incident.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.route("/").get(verifyJWT, getAllIncidents);
router.route("/report").post(verifyJWT, reportIncident);
router.route("/:incidentId/status").patch(verifyJWT, updateIncidentStatus);
router.route("/:incidentId").delete(verifyJWT, deleteIncident)
router.route("/:incidentId/verification").patch(verifyJWT, updateIncidentVerification);
router.route("/:incidentId/upvote").patch(verifyJWT, upvoteIncident);
router.route("/:incidentId/downvote").patch(verifyJWT, downvoteIncident);

export default router;