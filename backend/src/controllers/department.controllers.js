import { Department } from "../models/department.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const createDepartment = asyncHandler(async (req, res) => {
    const { category_id, name, contact_email, contact_phone, jurisdiction_area } = req.body;

    if (!category_id || !name || !contact_email) {
        throw new ApiError(400, "All required fields must be provided");
    }

    const newDept = await Department.create({
        category_id,
        name,
        contact_email,
        contact_phone,
        jurisdiction_area
    });

    res.status(201).json({
        success: true,
        message: "Department created successfully",
        data: newDept
    });
})

const getAllDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find()
        .populate("category_id", "name")
        .sort({ name: 1 });

    if (!departments || departments.length === 0) {
        throw new ApiError(404, "No departments found");
    }

    res.status(200).json({
        success: true,
        data: departments
    });
})

const getDepartmentById = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID format");
    }

    const department = await Department.findById(departmentId)
        .populate("category_id", "name");

    if (!department) {
        throw new ApiError(404, "Department not found");
    }

    res.status(200).json({
        success: true,
        data: department
    });
})

const updateDepartment = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID format");
    }

    const updatedDept = await Department.findByIdAndUpdate(departmentId, updates, { new: true });

    if (!updatedDept) {
        throw new ApiError(404, "Department not found");
    }

    res.status(200).json({
        success: true,
        message: "Department updated successfully",
        data: updatedDept
    });
})

const deleteDepartment = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID format");
    }

    const deletedDept = await Department.findByIdAndDelete(departmentId);

    if (!deletedDept) {
        throw new ApiError(404, "Department not found");
    }

    res.status(200).json({
        success: true,
        message: "Department deleted successfully",
        data: deletedDept
    });
})

const getDepartmentsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(400, "Invalid category ID format");
    }

    const departments = await Department.find({ category_id: categoryId })
        .populate("category_id", "name")
        .sort({ name: 1 });

    if (!departments || departments.length === 0) {
        throw new ApiError(404, "No departments found for this category");
    }

    res.status(200).json({
        success: true,
        data: departments
    });
})

export {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    getDepartmentsByCategory,
}