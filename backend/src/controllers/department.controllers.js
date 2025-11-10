import { Department } from "../models/department.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";

const allowedCategories = ['fire', 'police', 'rail', 'cyber', 'court', 'road'];

const createDepartment = asyncHandler(async (req, res) => {
    const { category, name, contact_email, contact_phone, jurisdiction_level, department_secret } = req.body;

    if (!allowedCategories.includes(category)) {
        throw new ApiError(400, "Invalid category value");
    }
    
    if (!category || !name || !contact_email || !department_secret) {
        throw new ApiError(400, "All required fields must be provided");
    }

    const existingEmailDept = await Department.findOne({ contact_email });
    if (existingEmailDept) {
        throw new ApiError(409, "A department with this email already exists");
    }

    if (contact_phone) {
        const conflictingPhoneDept = await Department.findOne({
            contact_phone,
            category: { $ne: category }
        })

        if (conflictingPhoneDept) {
            throw new ApiError(409, `Phone number is already in use by a ${conflictingPhoneDept.category} department`)
        }
    }

    const newDept = await Department.create({
        category,
        name,
        contact_email,
        contact_phone,
        jurisdiction_level,
        department_secret,
    });

    res.status(201).json({
        success: true,
        message: "Department created successfully",
        data: {
            ...newDept.toObject(),
            department_secret: undefined,
        }
    });
})

const getAllDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find()
        .populate("name")
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
        .populate("name");

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
    const { category } = req.params;
    if (!allowedCategories.includes(category)) {
        throw new ApiError(400, "Invalid category value");
    }

    const departments = await Department.find({ category })
        .populate("name")
        .sort({ name: 1 });

    if (!departments || departments.length === 0) {
        throw new ApiError(404, "No departments found for this category");
    }

    res.status(200).json({
        success: true,
        data: departments
    });
})

const validateDepartmentSecret = asyncHandler(async (req, res) => {
    const { department_id, department_secret } = req.body;

    if (!department_id || !department_secret) {
        throw new ApiError(400, "Department ID and department secret are required")
    }

    if (!mongoose.Types.ObjectId.isValid(department_id)) {
        throw new ApiError(400, "Invalid department ID format");
    }

    const dept = await Department.findById(department_id).select("+department_secret");

    if (!dept) {
        throw new ApiError(404, "Department not found");
    }

    const isValid = await dept.verifySecret(department_secret);
    if (!isValid) {
        throw new ApiError(401, "Invalid department secret code");
    }

    return res.status(200).json({
        success: true,
        message: "Department secret verified successfully",
        data: { 
            department_id: dept._id,
            category: dept.category, 
            name: dept.name, 
            jurisdiction_level: dept.jurisdiction_level 
        },
    });
})

export {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    getDepartmentsByCategory,
    validateDepartmentSecret,
}