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

    if (creator.officer_category !== category) {
        // console.log(creator.officer_category, category);
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

    const levels = [
        creator.user_level,
        ...officers.map(o => o.user_level)
    ];

    const teamLevel = levels.reduce((sum, lvl) => sum + lvl, 0) / levels.length;

    const finalTeamLevel = Math.round(teamLevel * 100) / 100;

    const team = await Team.create({
        name,
        category,
        department_id,
        head: req.user._id,
        members,
        team_level: finalTeamLevel
    });

    res.status(201).json({
        success: true,
        data: team,
        message: "Team created successfully"
    })
})

// Need to be worked on
const updateTeam = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const user = req.user;
    const updates = req.body;

    if (!user || user.role !== "officer") {
        throw new ApiError(403, "Access denied. Only officers can update a team.");
    }

    const team = await Team.findById(teamId);
    if (!team) {
        throw new ApiError(404, "Team not found");
    }

    const isMember = team.members.some(
        memberId => memberId.toString() === user._id.toString()
    );

    if (!isMember) {
        throw new ApiError(403, "You must be a member of this team to update it.")
    }

    const updateTeam = await Team.findByIdAndUpdate(teamId, updates, {
        new: true,
        runValidators: true,
    })

    res.status(200).json({ success: true, data: updateTeam });
})

const getTeamById = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const user = req.user;

    if (!user || user.role !== "officer") {
        throw new ApiError(403, "Access denied. Only officers can view team details.");
    }

    const team = await Team.findById(teamId)
        .populate("members", "name email officer_category")
        .populate("head", "name email officer_category")
        .populate("department_id", "name category")
        .populate("assigned_complaints");

    if (!team) throw new ApiError(404, "Team not found");

    if (user.department_id.toString() !== team.department_id._id.toString()) {
        throw new ApiError(403, "You cannot access teams outside your department.")
    }

    const isMember = team.members.some(
        (m) => m._id.toString() === user._id.toString()
    );

    if (!isMember && team.head._id.toString() !== user._id.toString()) {
        throw new ApiError(403, "Only team members or team head can view this team.");
    }

    res.status(200).json({ success: true, data: team });
})

const deleteTeam = asyncHandler(async(req, res) => {
    const { teamId } = req.params;
    const user = req.user;

    if (!user || user.role !== "officer") {
        throw new ApiError(403, "Access denied. Only officers can delete a team.")
    }

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    if (team.head.toString() !== user._id.toString()) {
        throw new ApiError(403, "Only the team head can delete a team.");
    }

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
    const user = req.user;

    if (!user || user.role !== "officer") {
        throw new ApiError(403, "Only officers can remove members from a team.");
    }

    const team = await Team.findById(teamId);
    if (!team) {
        throw new ApiError(404, "Team not found");
    }

    const isMember = team.members.some(
        memberId => memberId.toString() === user._id.toString()
    );

    if (!isMember) {
        throw new ApiError(403, "You must be a member of this team to update it.")
    }

    if (team.head.toString() !== user._id.toString()) {
        throw new ApiError(403, "Only team head can remove members from a team.");
    }

    team.members = team.members.filter((m) => m.toString() !== memberId);
    await team.save();

    res.status(200).json({ success: true, data: team });
})

const addComplaintToTeam = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const { complaintId } = req.body;
    const user = req.user;

    if (!user || user.role !== "officer") {
        throw new ApiError(403, "Only officers can assign complaints to a team.");
    }

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    const isMember = team.members.some(
        (memberId) => memberId.toString() === user._id.toString()
    );

    if (!isMember) {
        throw new ApiError(403, "Only team members can add complaints to this team.");
    }

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
    const user = req.user;

    if (!user || user.role !== "officer") {
        throw new ApiError(403, "Only officers can remove complaints");
    }

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    const isMember = team.members.some(
        (memberId) => memberId.toString() === user._id.toString()
    );

    if (!isMember) {
        throw new ApiError(403, "Only team members can remove complaints.");
    }

    team.assigned_complaints = team.assigned_complaints.filter(
        (c) => c.toString() !== complaintId
    );

    await team.save();

    res.status(200).json({ success: true, data: team });
});

const getTeamDetails = asyncHandler(async (req, res) => {
    try {
        const { teamId } = req.params;
        const user = req.user;

        if (!user || user.role !== "officer") {
            throw new ApiError(403, "Access denied. Only officers can view team details.")
        }

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