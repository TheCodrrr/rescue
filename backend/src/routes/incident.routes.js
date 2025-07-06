import express from "express";
import { deleteIncident, downvoteIncident, getAllIncidents, reportIncident, updateIncidentStatus, updateIncidentVerification, upvoteIncident, getIncidentById } from "../controllers/incident.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import multer from "multer";
const upload = multer();

const router = express.Router();

// To be completed after incident routes are implemented
router.route("/").get(verifyJWT, getAllIncidents);
// To be decided if this route would be used in incident or in user routes where user would be able to verify a incident he/she finds
router.route("/:incidentId/verification").patch(verifyJWT, updateIncidentVerification);


router.route("/report").post(verifyJWT, upload.none(), reportIncident);
router.route("/:incidentId/status").patch(verifyJWT, upload.none(), updateIncidentStatus);
router.route("/:incidentId").delete(verifyJWT, deleteIncident);



router.route("/:incidentId/upvote").patch(verifyJWT, upvoteIncident);
router.route("/:incidentId/downvote").patch(verifyJWT, downvoteIncident);
router.route("/:incidentId").get(verifyJWT, getIncidentById);

export default router;