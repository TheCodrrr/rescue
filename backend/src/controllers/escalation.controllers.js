import { Escalation } from "../models/escalation.models.js";
import { Complaint } from "../models/complaint.models.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const createEscalationHistory = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;

  // Make sure complaint exists
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found.");
  }

  // Check if escalation already exists
  const existingEscalation = await Escalation.findOne({ complaint: complaintId });
  if (existingEscalation) {
    throw new ApiError(400, "Escalation history already exists for this complaint.");
  }

  // Create new escalation document with empty history
  const escalation = await Escalation.create({
    complaint: complaintId,
    history: [],
  });

  // Link escalation to complaint
  complaint.escalation_id = escalation._id;
  await complaint.save();

  res.status(201).json({
    success: true,
    message: "Escalation history created successfully.",
    escalation,
  });
});

const addEscalationEvent = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  const { from_level, to_level, reason } = req.body;
  const escalated_by = req.user._id; // verified user

  // Make sure complaint exists
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found.");
  }

  // Make sure escalation history exists
  const escalation = await Escalation.findOne({ complaint: complaintId });
  if (!escalation) {
    throw new ApiError(404, "Escalation history not found for this complaint. Create it first.");
  }

  // Add new escalation event
  escalation.history.push({
    from_level,
    to_level,
    reason,
    escalated_by,
  });

  await escalation.save();

  // Optionally, also update complaint's current level
  complaint.level = to_level;
  await complaint.save();

  res.status(200).json({
    success: true,
    message: "Escalation event added successfully.",
    escalation,
  });
});

const getEscalationHistory = asyncHandler(async(req, res) => {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, "Complaint not found.");

    const escalation = await Escalation.findOne({ complaint: complaintId })
        .populate("history.escalated_by", "name email")
        .populate("complaint", "title status");

    if (!escalation) throw new ApiError(404, "Escalation history not found for this complaint.");

    res.status(200).json({
        success: true,
        data: escalation,
    })
})

export {
    createEscalationHistory,
    addEscalationEvent,
    getEscalationHistory,
}