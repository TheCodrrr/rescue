import {
  createFeedback,
  getFeedbackById,
  getFeedbackByComplaint,
  updateFeedback,
  deleteFeedback,
} from "../controllers/feedback.controllers.js";
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/", verifyJWT, createFeedback);
router.route("/:feedbackId")
    .get(getFeedbackById)
    .patch(verifyJWT, updateFeedback)
    .delete(verifyJWT, deleteFeedback);
router.get("/complaint/:complaintId", getFeedbackByComplaint);

export default router;