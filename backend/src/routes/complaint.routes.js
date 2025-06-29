import express from "express";
import { assignComplaintToDepartment, createComplaint, deleteComplaint, getComplaintById, getComplaintByUser, updateComplaintStatus } from "../controllers/complaint.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares";

const router = express.Router();

router.route("/create").post(verifyJWT, createComplaint);
router.route("/:complaintId").get(verifyJWT, getComplaintById);
router.route("/my-complaints").get(verifyJWT, getComplaintByUser);
router.route("/:complaintId/status").patch(verifyJWT, updateComplaintStatus);
router.route("/:complaintId/assign").patch(verifyJWT, assignComplaintToDepartment);
router.route("/:complaintId").delete(verifyJWT, deleteComplaint);

export default router;