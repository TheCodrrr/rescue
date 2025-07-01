import {
  createFeedback,
  getFeedbackById,
  getFeedbackByComplaint,
  updateFeedback,
  deleteFeedback,
} from "../controllers/feedback.controllers.js";

router.post("/", verifyJWT, createFeedback);
router.route("/:feedbackId")
    .get(getFeedbackById)
    .patch(verifyJWT, updateFeedback)
    .delete(verifyJWT, deleteFeedback);
router.get("/complaint/:complaintId", getFeedbackByComplaint);
