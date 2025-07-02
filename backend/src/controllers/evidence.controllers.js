import { Evidence } from "../models/evidence.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const submitEvidence = asyncHandler(async (req, res) => {
    const { category_id, evidence_type, evidence_url } = req.body;
    const submitted_by = req.user._id;

    if (!category_id || !evidence_type || !evidence_url) {
        throw new ApiError(400, "category_id, evidence_type, and evidence_url are required.");
    }

    const allowedTypes = ["image", "video", "text", "audio"];
    if (!allowedTypes.includes(evidence_type)) {
        throw new ApiError(400, `Invalid evidence type, allowed: ${allowedTypes.join(", ")}.`);
    }

    const evidence = await Evidence.create({
        submitted_by,
        category_id,
        evidence_type,
        evidence_url,
    });

    res.status(201).json({
        success: true,
        message: "Evidence submitted successfully.",
        data: evidence,
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

const getEvidenceByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(400, "Invalid category ID.");
    }

    const evidenceList = await Evidence.find({ category_id: categoryId })
        .populate("submitted_by", "name email")
        .populate("category_id", "name");

    res.status(200).json({
        success: true,
        data: evidenceList,
    });
});

const getEvidenceByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID.");
    }

    const evidenceList = await Evidence.find({ submitted_by: userId })
        .populate("submitted_by", "name email")
        .populate("category_id", "name");

    res.status(200).json({
        success: true,
        data: evidenceList,
    });
});

const deleteEvidence = asyncHandler(async (req, res) => {
    const { evidenceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(evidenceId)) {
        throw new ApiError(400, "Invalid evidence ID.");
    }

    const deletedEvidence = await Evidence.findByIdAndDelete(evidenceId);

    if (!deletedEvidence) throw new ApiError(404, "Evidence not found.");

    res.status(200).json({
        success: true,
        message: "Evidence deleted successfully.",
    });
});

export {
    submitEvidence,
    getAllEvidence,
    getEvidenceByCategory,
    getEvidenceByUser,
    deleteEvidence
}