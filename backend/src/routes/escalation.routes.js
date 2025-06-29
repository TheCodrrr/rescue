import express from "express";
import { createEscalationHistory, addEscalationEvent, getEscalationHistory } from "../controllers/escalation.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.route("/:complaintId/create").post(verifyJWT, createEscalationHistory);
router.route("/:complaintId/add-event").patch(verifyJWT, addEscalationEvent);
router.route("/:complaintId/history").get(verifyJWT, getEscalationHistory);

export default router;