import { Evidence } from "../models/evidence.models.js";
import { Complaint } from "../models/complaint.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import mongoose from "mongoose";

const submitEvidence = asyncHandler(async (req, res) => {
    const { complaint_id, evidence_type, category, description } = req.body;
    const submitted_by = req.user._id;
    const submitted_by_role = req.user.role;

    if (!complaint_id || !evidence_type || !category) {
        throw new ApiError(400, "complaint_id, category, and evidence_type are required.");
    }

    // Verify complaint exists
    const complaint = await Complaint.findById(complaint_id);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found.");
    }

    const allowedTypes = ["image", "video", "text", "audio", "document"];
    if (!allowedTypes.includes(evidence_type)) {
        throw new ApiError(400, `Invalid evidence type, allowed: ${allowedTypes.join(", ")}.`);
    }

    let evidence_url = null;
    let file_name = null;
    let file_size = null;
    let mime_type = null;
    let public_id = null;

    // Handle file upload if present
    if (req.file) {
        const localFilePath = req.file.path;
        file_name = req.file.originalname;
        file_size = req.file.size;
        mime_type = req.file.mimetype;

        // Upload to Cloudinary
        const uploadResult = await uploadOnCloudinary(localFilePath);
        if (!uploadResult) {
            throw new ApiError(500, "Failed to upload file to cloud storage.");
        }

        evidence_url = uploadResult.secure_url;
        public_id = uploadResult.public_id;
    } else {
        throw new ApiError(400, "File is required for evidence submission.");
    }

    const evidence = await Evidence.create({
        complaint_id,
        submitted_by,
        submitted_by_role,
        category,
        evidence_type,
        evidence_url,
        description,
        file_name,
        file_size,
        mime_type,
        public_id
    });

    // Add evidence to complaint's evidence_ids array
    complaint.evidence_ids.push(evidence._id);
    await complaint.save();

    // Populate the evidence before returning
    const populatedEvidence = await Evidence.findById(evidence._id)
        .populate("submitted_by", "name email profileImage role");

    res.status(201).json({
        success: true,
        message: "Evidence submitted successfully.",
        data: populatedEvidence,
    });
});

const getAllEvidence = asyncHandler(async(_, res) => {
    const evidenceList = await Evidence.find()
        .populate("submitted_by", "name email")
        .populate("category_id", "name");

    res.status(200).json({
        success: true,
        data: evidenceList,
    });
});

const getEvidenceByComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;

    if (!complaintId) {
        throw new ApiError(400, "Complaint ID is required.");
    }

    const evidenceList = await Evidence.find({ complaint_id: complaintId })
        .populate("submitted_by", "name email profileImage role")
        .populate("complaint_id", "title category")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: evidenceList.length,
        data: evidenceList,
    });
});

const getEvidenceByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID.");
    }

    const evidenceList = await Evidence.find({ submitted_by: userId })
        .populate("submitted_by", "name email profileImage role")
        .populate("complaint_id", "title category")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: evidenceList.length,
        data: evidenceList,
    });
});

const deleteEvidence = asyncHandler(async (req, res) => {
    const { evidenceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(evidenceId)) {
        throw new ApiError(400, "Invalid evidence ID.");
    }

    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
        throw new ApiError(404, "Evidence not found.");
    }

    // Only allow the submitter or admin to delete
    if (evidence.submitted_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, "You are not authorized to delete this evidence.");
    }

    // Delete from cloudinary if public_id exists
    if (evidence.public_id) {
        await deleteFromCloudinary(evidence.public_id);
    }

    // Remove evidence from complaint's evidence_ids array
    await Complaint.findByIdAndUpdate(
        evidence.complaint_id,
        { $pull: { evidence_ids: evidence._id } }
    );

    await Evidence.findByIdAndDelete(evidenceId);

    res.status(200).json({
        success: true,
        message: "Evidence deleted successfully.",
    });
});

export {
    submitEvidence,
    getAllEvidence,
    getEvidenceByComplaint,
    getEvidenceByUser,
    deleteEvidence
}