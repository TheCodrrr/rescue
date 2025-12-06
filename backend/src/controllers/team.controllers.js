import { Team } from "../models/team.models.js";
import { User } from "../models/user.models.js";
import { Complaint } from "../models/complaint.models.js";
import { Department } from "../models/department.models.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import mongoose from "mongoose";
import { teamPipeline } from "../pipelines/team.pipeline.js";

const createTeam = asyncHandler(async (req, res) => {
    const { name, category, department_id, members = [] } = req.body;

    const creator = await User.findById(req.user._id);

    if (!creator || creator.role !== "officer") {
        throw new ApiError(403, "Only officers can create teams");
    }

    if (!creator.officer_category !== category) {
        throw new ApiError(400, "Officer category mismatch");
    }

    if (department_id) {
        const dp = await Department.findById(department_id);
        if (!dp || dp.category !== category) {
            throw new ApiError(400, "Invalid department for this category")
        }
    }

    const officers = await User.find({
        _id: { $in: members },
        role: "officer",
        officer_category: category,
    })

    if (officers.length !== members.length) {
        throw new ApiError(400, "Some members are not valid officers for this category");
    }

    const team = await Team.create({
        name,
        category,
        department_id,
        head: req.user._id,
        members
    });

    res.status(201).json({
        success: true,
        data: team,
        message: "Team created successfully"
    })
})

const updateTeam = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const updates = req.body;

    const team = await Team.findByIdAndUpdate(teamId, updates, {
        new: true,
        runValidators: true
    })

    if (!team) throw new ApiError(404, "Team not found");
    res.status(200).json({ success: true, data: team });
})

const getTeamById = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId)
        .populate("members", "name email officer_category")
        .populate("head", "name email officer_category")
        .populate("department_id", "name category")
        .populate("assigned_complaints");

    if (!team) throw new ApiError(404, "Team not found");

    res.status(200).json({ success: true, data: team });
})

const deleteTeam = asyncHandler(async(req, res) => {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    await team.deleteOne();

    res.status(200).json({ success: true, message: "Team deleted successfully" });
})

const addMemberToTeam = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const { memberId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    const user = await User.findById(memberId);

    if (!user || user.role !== "officer") {
        throw new ApiError(400, "Only officers can be added")
    }

    if (user.officer_category !== team.category) {
        throw new ApiError(400, "Officer category mismatch");
    }

    if (team.members.includes(memberId)) {
        throw new ApiError(400, "Officer already in team");
    }

    team.members.push(memberId);
    await team.save();

    res.status(200).json({ success: true, data: team });
})

const removeMemberFromTeam = asyncHandler(async(req, res) => {
    const { teamId } = req.params;
    const { memberId } = req.body;

    const team = Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    team.members = team.members.filter((m) => m.toString() !== memberId);
    await team.save();

    res.status(200).json({ success: true, data: team });
})

const addComplaintToTeam = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const { complaintId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, "Complaint not found");

    if (complaint.category !== team.category)
        throw new ApiError(400, "Complaint category doesn't match team category");

    if (team.assigned_complaints.includes(complaintId))
        throw new ApiError(400, "Complaint already assigned");

    team.assigned_complaints.push(complaintId);
    await team.save();

    res.status(200).json({ success: true, data: team });
});

const removeComplaintFromTeam = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const { complaintId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    team.assigned_complaints = team.assigned_complaints.filter(
        (c) => c.toString() !== complaintId
    );

    await team.save();

    res.status(200).json({ success: true, data: team });
});

const getTeamDetails = asyncHandler(async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new ApiError(400, "Invalid team ID");
        }

        const objectId = new mongoose.Types.ObjectId(teamId);

        const result = await Team.aggregate(teamPipeline(objectId));

        if (!result || result.length === 0) {
            throw new ApiError(404, "Team not found");
        }

        return res.status(200).json({
            success: true,
            data: result[0],
            message: "team details fetched successfully"
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message,
        })
    }
})

export {
    createTeam,
    updateTeam,
    getTeamById,
    deleteTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    addComplaintToTeam,
    removeComplaintFromTeam,
    getTeamDetails,
}