import { Escalation } from "../models/escalation.models.js";
import { Complaint } from "../models/complaint.models.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import redisClient from "../../utils/redisClient.js";

// const createEscalationHistory = asyncHandler(async (req, res) => {
//   const { complaintId } = req.params;
//   // console.log("Creating escalation history for complaint:", complaintId);
  
//   const complaint = await Complaint.findById(complaintId);
//   if (!complaint) {
//     throw new ApiError(404, "Complaint not found.");
//   }

  
//   const existingEscalation = await Escalation.findOne({ complaint: complaintId });
//   if (existingEscalation) {
//     throw new ApiError(400, "Escalation history already exists for this complaint.");
//   }

  
//   const escalation = await Escalation.create({
//     complaint: complaintId,
//     history: [],
//   });


//   complaint.escalation_id = escalation._id;
//   await complaint.save();

//   res.status(201).json({
//     success: true,
//     message: "Escalation history created successfully.",
//     data: escalation,
//   });
// });

const addEscalationEvent = asyncHandler(async (req, res) => {
    console.log("🔄 Adding escalation event for complaint:", req.params.complaintId);
    console.log("📝 Request body:", req.body);
    console.log("👤 User:", { id: req.user._id, role: req.user.role });
    
    const { complaintId } = req.params;
    let { from_level, to_level, reason } = req.body;
    if (!reason) reason = "Initial assignment of complaint to an officer"
    const escalated_by = req.user._id;

    if (!["admin", "officer"].includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to escalate this complaint");
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    console.log("📋 Current complaint level:", complaint.level);

    const fromLevelValue = from_level ?? complaint.level;
    const toLevelValue = to_level ?? fromLevelValue + 1;

    console.log("📊 Escalation levels:", { from: fromLevelValue, to: toLevelValue });

    let escalation = await Escalation.findOne({ complaint: complaintId });
    if (!escalation) {
      console.log("🆕 Creating new escalation document");
      escalation = await Escalation.create({
        complaint: complaintId,
        history: [],
      });

      complaint.escalation_id = escalation._id;
    } else {
      console.log("📝 Found existing escalation:", escalation._id);
    }

    escalation.history.push({
      from_level: fromLevelValue,
      to_level: toLevelValue,
      reason,
      escalated_by,
    })

    await escalation.save();
    console.log("✅ Escalation saved");

    complaint.level = toLevelValue;
    await complaint.save();
    console.log("✅ Complaint level updated to:", complaint.level);

    // Store notification in Redis for the user who registered the complaint
    try {
      const userId = complaint.user_id.toString();
      const notificationKey = `notification:${userId}:escalations`;
      
      const notificationData = {
        type: "escalation",
        complaint_id: complaintId,
        complaint_title: complaint.title,
        from_level: fromLevelValue,
        to_level: toLevelValue,
        reason: reason,
        escalated_by: req.user.name || "Officer",
        timestamp: new Date().toISOString(),
        read: false
      };

      // Add notification to a list (using LPUSH for newest first)
      await redisClient.lPush(notificationKey, JSON.stringify(notificationData));
      
      // Set expiry to 30 minutes (1800 seconds)
      await redisClient.expire(notificationKey, 30 * 60);
      
      console.log("✅ Escalation notification stored in Redis for user:", userId);
    } catch (redisError) {
      console.error("⚠️ Failed to store notification in Redis:", redisError);
      // Continue even if Redis fails - don't break the escalation
    }

    res.status(200).json({
      success: true,
      message: "Escalation event added successfully.",
      data: escalation,
    })
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
    // createEscalationHistory,
    addEscalationEvent,
    getEscalationHistory,
    getEscalationById,
    deleteEscalationHistory,
}