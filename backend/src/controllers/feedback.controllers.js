import { Feedback } from "../models/feedback.models.js";
import { Complaint } from "../models/complaint.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const createFeedback = asyncHandler(async (req, res) => {
  const { complaint_id, rating, comment } = req.body;

  if (!complaint_id || !rating) {
    throw new ApiError(400, "complaint_id and rating are required.");
  }

  const complaint = await Complaint.findById(complaint_id);
  if (!complaint) throw new ApiError(404, "Complaint not found.");

  const existingFeedback = await Feedback.findOne({ complaint_id });
  if (existingFeedback) throw new ApiError(400, "Feedback already submitted for this complaint.");

  const feedback = await Feedback.create({ complaint_id, rating, comment });

  complaint.feedback_id = feedback._id;
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

  const feedback = await Feedback.findOne({ complaint_id: complaintId });

  if (!feedback) throw new ApiError(404, "Feedback not found for this complaint.");

  res.status(200).json({
    success: true,
    feedback,
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