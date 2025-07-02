import { Incident } from "../models/incident.models.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import mongoose from "mongoose";

const reportIncident = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const {
        description,
        category,
        latitude,
        longitude,
        address,
        evidence,
        priority,
    } = req.body;

    if (!description || !category) {
        throw new ApiError(400, "All required fields must be provided");
    }

    const incident = await Incident.create({
        reportedBy: userId,
        description,
        category,
        latitude,
        longitude,
        address,
        evidence: evidence || [],
        priority: priority || 0, // Default priority if not provided
    });

    res.status(201).json({
        success: true,
        message: "Incident reported successfully",
        data: incident,
    })
});

const getIncidentById = asyncHandler(async (req, res) => {
    const { incidentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(400, "Invalid incident ID format");
    }

    const incident = await Incident.findById(incidentId)
        .populate("reportedBy", "name email")
        .populate("assigned_officer_id", "name email")
        .populate("category", "name")
        .populate("evidence");
    
    if (!incident) {
        throw new ApiError(404, "Incident not found");
    }

    res.status(200).json({
        success: true,
        data: incident,
    });
});

const getAllIncidents = asyncHandler(async(req, res) => {
    const {
        status,
        category,
        priorityMin,
        priorityMax,
        verified,
        reportedBy,
        assignedOfficer,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
    } = req.query;

    const filter = {};

    // Build filters dynamically
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (verified !== undefined) filter.verified = verified === "true";
    if (reportedBy) filter.reportedBy = reportedBy;
    if (assignedOfficer) filter.assigned_officer_id = assignedOfficer;

    // Priority range filter
    if (priorityMin || priorityMax) {
        filter.priority = {};
        if (priorityMin) filter.priority.$gte = Number(priorityMin);
        if (priorityMax) filter.priority.$lte = Number(priorityMax);
    }

    // Date range filter
    if (dateFrom || dateTo) {
        filter.incident_timestamp = {};
        if (dateFrom) filter.incident_timestamp.$gte = new Date(dateFrom);
        if (dateTo) filter.incident_timestamp.$lte = new Date(dateTo);
    }

    // pagination & sorting
    const skip = (Number(page) - 1) * Number(limit);

    const incidents = await Incident.find(filter)
        .populate("reportedBy", "name email")
        .populate("assigned_officer_id", "name email")
        .populate("category", "name")
        .populate("evidence")
        .sort({ incident_timestamp: -1 })
        .skip(skip)
        .limit(Number(limit));

    const totalIncidents = await Incident.countDocuments(filter);

    res.status(200).json({
        success: true,
        total: totalIncidents,
        page: Number(page),
        limit: Number(limit),
        data: incidents,
    })
})

const updateIncidentStatus = asyncHandler(async(req, res) => {
    const { incidentId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(400, "Invalid incident ID format");
    }

    const validStatuses = ["pending", "in_progress", "resolved", "rejected"];
    if (!status || !validStatuses.includes(status)) {
        throw new ApiError(400, `Status must be one of: ${validStatuses.join(", ")}`);
    }

    const updateIncident = await Incident.findByIdAndUpdate(
        incidentId,
        { status },
        { new: true }
    )
        .populate("reportedBy", "name email")
        .populate("assigned_officer_id", "name email")
        .populate("category", "name")
        .populate("evidence");
        
    if (!updateIncident) {
        throw new ApiError(404, "Incident not found");
    }

    res.status(200).json({
        success: true,
        message: "Incident status updated successfully",
        data: updateIncident,
    });
})

const deleteIncident = asyncHandler(async(req, res) => {
    const { incidentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(400, "Invalid incident ID format");
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
        throw new ApiError(404, "Incident not found");
    }

    await Incident.findByIdAndDelete(incidentId);
    
    res.status(200).json({
        success: true,
        message: "Incident deleted successfully",
    });
})

const updateIncidentVerification = asyncHandler(async (req, res) => {
    const { incidentId } = req.params;
    const { verified, verifiedBy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(400, "Invalid incident ID format");
    }

    if (typeof verified !== "boolean") {
        throw new ApiError(400, "Verified must be a boolean value");
    }

    if (verified === true) {
        if (!verifiedBy || !mongoose.Types.ObjectId.isValid(verifiedBy)) {
            throw new ApiError(400, "VerifiedBy must be a valid user ID when verifying an incident");
        }
    }

    const updateIncident = await Incident.findByIdAndUpdate(
        incidentId,
        updateData,
        { new: true }
    )
        .populate("reportedBy", "name email")
        .populate("assigned_officer_id", "name email")
        .populate("verifiedBy", "name email")
        .populate("category", "name")
        .populate("evidence");
        

    if (!updateIncident) {
        throw new ApiError(404, "Incident not found");
    }

    res.status(200).json({
        success: true,
        message: "Incident verification status updated successfully",
        data: updateIncident,
    });
})

const upvoteIncident = asyncHandler(async (req, res) => {
    const { incidentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(400, "Invalid incident ID format");
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
        throw new ApiError(404, "Incident not found");
    }

    const existingVote = incident.votedUsers.find(vote => vote.user.equals(userId));

    if (existingVote) {
        if (existingVote.vote === "upvote") {
            throw new ApiError(400, "You have already upvoted this incident.");
        } else if (existingVote.vote === "downvote") {
            incident.downvote -= 1;
            existingVote.vote = "upvote";
            incident.upvote += 1;
        }
    }
    else {
        incident.votedUsers.push({ user: userId, vote: "upvote" });
        incident.upvote += 1;
    }

    await incident.save();

    res.status(200).json({
        success: true,
        message: "Upvote recorded successfully.",
        data: incident,
    })
})

const downvoteIncident = asyncHandler(async (req, res) => {
    const { incidentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(400, "Invalid incident ID format");
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
        throw new ApiError(404, "Incident not found");
    }

    const existingVote = incident.votedUsers.find(vote => vote.user.equals(userId));

    if (existingVote) {
        if (existingVote.vote === "downvote") {
            throw new ApiError(400, "You have already downvoted this incident.");
        } else if (existingVote.vote === "upvote") {
            incident.upvote -= 1;
            existingVote.vote = "downvote";
            incident.downvote += 1;
        }
    }
    else {
        incident.votedUsers.push({ user: userId, vote: "downvote" });
        incident.downvote += 1;
    }

    await incident.save();

    res.status(200).json({
        success: true,
        message: "Downvote recorded successfully.",
        data: incident,
    })
})

export {
    reportIncident,
    getIncidentById,
    getAllIncidents,
    updateIncidentStatus,
    deleteIncident,
    upvoteIncident,
    downvoteIncident,
    updateIncidentVerification,
}