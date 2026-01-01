import express from "express";
import { assignComplaintToDepartment, createComplaint, deleteComplaint, downvoteComplaint, getComplaintById, getComplaintByUser, getComplaintByUserAndCategory, updateComplaintStatus, upvoteComplaint, getTrendingComplaints, getNearbyComplaints, searchMyComplaints } from "../controllers/complaint.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { pool } from "../config/postgres.js";
import { io } from "../server.js";

const router = express.Router();

router.route("/test-db").get(async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      message: "PostgreSQL connected successfully!",
      server_time: result.rows[0].now,
    });
  } catch (err) {
    console.error("DB Connection Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.route("/create").post(verifyJWT, createComplaint);
router.route("/my-complaints/search").get(verifyJWT, searchMyComplaints);
router.route("/my-complaints/").get(verifyJWT, getComplaintByUser);
router.route("/my-complaints/category/:category").get(verifyJWT, getComplaintByUserAndCategory);
router.route("/trending").get(getTrendingComplaints); // Move this before parameterized routes
router.get("/nearby", verifyJWT, getNearbyComplaints);
router.route("/:complaintId").get(verifyJWT, getComplaintById);
router.route("/:complaintId/status").patch(verifyJWT, updateComplaintStatus);

// To be completed after department routes are implemented
router.route("/:complaintId/assign").patch(verifyJWT, assignComplaintToDepartment);

router.route("/:complaintId").delete(verifyJWT, deleteComplaint);
router.route("/:complaintId/upvote").patch(verifyJWT, upvoteComplaint);
router.route("/:complaintId/downvote").patch(verifyJWT, downvoteComplaint);

export default router;