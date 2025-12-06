import { Department } from "../models/department.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";
import { Complaint } from "../models/complaint.models.js";
import { User } from "../models/user.models.js";
import { complaintPipeline, officerPipeline, statsPipeline } from "../pipelines/department.pipeline.js";

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

const getDepartmentDetailsById = asyncHandler(async (req, res) => {
    let { departmentId } = req.params;
    departmentId = new mongoose.Types.ObjectId(departmentId);

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID format");
    }

    const department = await Department.findById(departmentId);

    if (!department) {
        throw new ApiError(404, "Department not found");
    }

    const [complaintsData, officerData, statsData] = await Promise.all([
        Complaint.aggregate(complaintPipeline(department.category)),
        User.aggregate(officerPipeline(department.category)),
        Complaint.aggregate(statsPipeline(department.category))
    ]);

    // Format statistics data
    const stats = statsData[0] || {};
    const statusBreakdown = {};
    const severityBreakdown = {};
    const levelBreakdown = {};

    (stats.statusCounts || []).forEach(item => {
        statusBreakdown[item._id] = item.count;
    });

    (stats.severityCounts || []).forEach(item => {
        severityBreakdown[item._id] = item.count;
    });

    (stats.levelCounts || []).forEach(item => {
        levelBreakdown[`level_${item._id}`] = item.count;
    });

    const totalStats = stats.totalStats?.[0] || {};

    return res.status(200).json({
        success: true,
        message: "Department details fetched successfully.",
        data: {
            department: {
                _id: department._id,
                name: department.name,
                category: department.category,
                contact_email: department.contact_email,
                contact_phone: department.contact_phone,
                jurisdiction_level: department.jurisdiction_level
            },
            statistics: {
                total_complaints: totalStats.total || 0,
                active_complaints: totalStats.activeComplaints || 0,
                avg_upvotes: Math.round((totalStats.avgUpvotes || 0) * 10) / 10,
                avg_downvotes: Math.round((totalStats.avgDownvotes || 0) * 10) / 10,
                by_status: {
                    pending: statusBreakdown.pending || 0,
                    in_progress: statusBreakdown.in_progress || 0,
                    resolved: statusBreakdown.resolved || 0,
                    rejected: statusBreakdown.rejected || 0
                },
                by_severity: {
                    low: severityBreakdown.low || 0,
                    medium: severityBreakdown.medium || 0,
                    high: severityBreakdown.high || 0
                },
                by_level: levelBreakdown,
                recent_complaints: stats.recentComplaints || []
            },
            complaints: complaintsData,
            officers: officerData,
            total_officers: officerData.length
        }
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
    getDepartmentDetailsById,
    validateDepartmentSecret,
}