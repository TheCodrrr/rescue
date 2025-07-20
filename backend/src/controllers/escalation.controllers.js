import { Escalation } from "../models/escalation.models.js";
import { Complaint } from "../models/complaint.models.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const createEscalationHistory = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  // console.log("Creating escalation history for complaint:", complaintId);
  
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found.");
  }

    
  const existingEscalation = await Escalation.findOne({ complaint: complaintId });
  if (existingEscalation) {
    throw new ApiError(400, "Escalation history already exists for this complaint.");
  }

  
  const escalation = await Escalation.create({
    complaint: complaintId,
    history: [],
  });


  complaint.escalation_id = escalation._id;
  await complaint.save();

  res.status(201).json({
    success: true,
    message: "Escalation history created successfully.",
    data: escalation,
  });
});

const addEscalationEvent = asyncHandler(async (req, res) => {
  console.log("Adding escalation event for complaint:", req.user);
    const { complaintId } = req.params;
    const { from_level, to_level, reason } = req.body;
    const escalated_by = req.user._id;

    const fromLevelValue = from_level ?? complaint.level;
    const toLevelValue = to_level ?? fromLevelValue + 1;

    if (!["admin", "officer"].includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to escalate this complaint.");
    }
    
    
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found.");
    }

    
    const escalation = await Escalation.findOne({ complaint: complaintId });
    if (!escalation) {
      throw new ApiError(404, "Escalation history not found for this complaint. Create it first.");
    }

    
    escalation.history.push({
      from_level: fromLevelValue,
      to_level: toLevelValue,
      reason,
      escalated_by,
    });

    await escalation.save();

    
    complaint.level = to_level;
    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Escalation event added successfully.",
      data: escalation,
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
});

const deleteEscalationHistory = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, "Complaint not found.");

    const escalation = await Escalation.findOneAndDelete({ complaint: complaintId });

    if (!escalation) throw new ApiError(404, "Escalation history not found.");

    
    complaint.escalation_id = null;
    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Escalation history deleted successfully.",
    });
});

const getEscalationById = asyncHandler(async (req, res) => {
    const { escalationId } = req.params;

    const escalation = await Escalation.findById(escalationId)
      .populate("history.escalated_by", "name email")
      .populate("complaint", "title status");

    if (!escalation) throw new ApiError(404, "Escalation not found.");

    res.status(200).json({
      success: true,
      data: escalation,
    });
});


export {
    createEscalationHistory,
    addEscalationEvent,
    getEscalationHistory,
    getEscalationById,
    deleteEscalationHistory,
}