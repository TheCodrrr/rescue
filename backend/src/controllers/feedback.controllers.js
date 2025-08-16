import { Feedback } from "../models/feedback.models.js";
import { Complaint } from "../models/complaint.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";

const createFeedback = asyncHandler(async (req, res) => {
  const { complaint_id, user_id, rating, comment } = req.body;

  if (!complaint_id || !user_id || !rating) {
    throw new ApiError(400, "complaint_id, user_id, and rating are required.");
  }

  const complaint = await Complaint.findById(complaint_id);
  if (!complaint) throw new ApiError(404, "Complaint not found.");

  const feedback = await Feedback.create({ complaint_id, user_id, rating, comment });

  complaint.feedback_ids = feedback._id;
  await complaint.save();

  res.status(201).json({
    success: true,
    message: "Feedback created successfully.",
    feedback,
  });
});

const getFeedbackById = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID.");
  }

  const feedback = await Feedback.findById(feedbackId).populate("complaint_id");

  if (!feedback) throw new ApiError(404, "Feedback not found.");

  res.status(200).json({
    success: true,
    feedback,
  });
});

const getFeedbackByComplaint = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(complaintId)) {
    throw new ApiError(400, "Invalid complaint ID.");
  }

  const feedbacks = await Feedback.find({ complaint_id: complaintId })
    .populate("user_id", "name email profileImage")
    .sort({ createdAt: -1 });

  if (!feedbacks || feedbacks.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
    })
  }

  res.status(200).json({
    success: true,
    data: feedbacks,
  });
});


const updateFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID.");
  }

  const updatedFeedback = await Feedback.findByIdAndUpdate(
    feedbackId,
    { rating, comment },
    { new: true }
  ).populate("complaint_id");

  if (!updatedFeedback) throw new ApiError(404, "Feedback not found.");

  res.status(200).json({
    success: true,
    message: "Feedback updated successfully.",
    feedback: updatedFeedback,
  });
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, "Invalid feedback ID.");
  }

  const deletedFeedback = await Feedback.findByIdAndDelete(feedbackId);

  if (!deletedFeedback) throw new ApiError(404, "Feedback not found.");

  await Complaint.updateOne(
    { feedback_id: feedbackId },
    { $unset: { feedback_id: "" } }
  );

  res.status(200).json({
    success: true,
    message: "Feedback deleted successfully.",
  });
});

export {
  createFeedback,
  getFeedbackById,
  getFeedbackByComplaint,
  updateFeedback,
  deleteFeedback,
};