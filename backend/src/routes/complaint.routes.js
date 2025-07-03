import express from "express";
import { assignComplaintToDepartment, createComplaint, deleteComplaint, downvoteComplaint, getComplaintById, getComplaintByUser, updateComplaintStatus, upvoteComplaint } from "../controllers/complaint.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.route("/create").post(verifyJWT, createComplaint);
router.route("/my-complaints/").get(verifyJWT, getComplaintByUser);
router.route("/:complaintId").get(verifyJWT, getComplaintById);
router.route("/:complaintId/status").patch(verifyJWT, updateComplaintStatus);
router.route("/:complaintId/assign").patch(verifyJWT, assignComplaintToDepartment);
router.route("/:complaintId").delete(verifyJWT, deleteComplaint);
router.route("/:complaintId/upvote").patch(verifyJWT, upvoteComplaint);
router.route("/:complaintId/downvote").patch(verifyJWT, downvoteComplaint);

export default router;