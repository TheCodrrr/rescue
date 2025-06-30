import { Category } from "../models/category.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ category_count: -1 });

    if (!categories || categories.length === 0) {
        throw new ApiError(404, "No categories found");
    }

    res.status(200).json({
        success: true,
        data: categories
    });
})

const incrementCategoryCount = asyncHandler(async (categoryId) => {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(400, "Invalid category ID format");
    }

    await Category.findByIdAndUpdate(categoryId, { $inc: { category_count: 1 } }, { new: true });
})

const decrementCategoryCount = asyncHandler(async (categoryId) => {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(400, "Invalid category ID format");
    }

    await Category.findByIdAndUpdate(categoryId, { $inc: { category_count: -1 } }, { new: true });
})

// ✅ Use this internally in your incident or complaint creation logic, e.g., after saving a new complaint:
// await incrementCategoryCount(newComplaint.category);
// await decrementCategoryCount(newComplaint.category);

export {
    getAllCategories,
    incrementCategoryCount,
    decrementCategoryCount,
}