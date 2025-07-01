import { Guidance } from "../models/guidance.models";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const addGuidance = asyncHandler(async (req, res) => {
    const { source_link_url, category_id } = req.body;
    const added_by = req.user._id;

    if (!source_link_url || !Array.isArray(source_link_url) || source_link_url.length === 0) {
        throw new ApiError(400, "At least one source_link_url is required.");
    }

    const guidance = await Guidance.create({
        added_by,
        source_link_url,
        category_id,
    });

    res.status(201).json({
        success: true,
        message: "Guidance added successfully.",
        data: guidance,
    });
});

const getAllGuidance = asyncHandler(async (req, res) => {
    const guidance = await Guidance.find()
        .populate("added_by", "name email")
        .populate("category_id", "name");

    res.status(200).json({
        success: true,
        data: guidance,
    });
})

const getGuidanceByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(400, "Invalid category ID.");
    }

    const guidanceList = await Guidance.find({ category_id: categoryId })
        .populate("added_by", "name email")
        .populate("category_id", "name");

    res.status(200).json({
        success: true,
        data: guidanceList,
    });
});

export const verifyGuidance = asyncHandler(async (req, res) => {
    const { guidanceId } = req.params;
    const { verified } = req.body;

    if (!mongoose.Types.ObjectId.isValid(guidanceId)) {
        throw new ApiError(400, "Invalid guidance ID.");
    }

    const updatedGuidance = await Guidance.findByIdAndUpdate(
        guidanceId,
        { verified },
        { new: true }
    ).populate("added_by", "name email");

    if (!updatedGuidance) throw new ApiError(404, "Guidance not found.");

    res.status(200).json({
        success: true,
        message: "Guidance verification updated successfully.",
        data: updatedGuidance,
    });
});

export const deleteGuidance = asyncHandler(async (req, res) => {
    const { guidanceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(guidanceId)) {
        throw new ApiError(400, "Invalid guidance ID.");
    }

    const deletedGuidance = await Guidance.findByIdAndDelete(guidanceId);

    if (!deletedGuidance) throw new ApiError(404, "Guidance not found.");

    res.status(200).json({
        success: true,
        message: "Guidance deleted successfully.",
    });
});

export {
    addGuidance,
    getAllGuidance,
    getGuidanceByCategory,
    verifyGuidance,
    deleteGuidance
}