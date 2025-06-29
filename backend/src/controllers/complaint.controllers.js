import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { Complaint } from "../models/complaint.model.js";
import { Category } from "../models/category.models.js";
import { Department } from "../models/department.models.js";

const createComplaint = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { title, description, categoryId, location, address, evidenceIds = [] } = req.body;

  if (!title || !description || !categoryId || !location || !address) {
    throw new ApiError(400, "All required fields (title, description, categoryId, location, address) must be provided");
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(400, "Invalid categoryId: category does not exist");
  }

  const complaint = await Complaint.create({
    title,
    description,
    category: categoryId,
    latitude: location.latitude,
    longitude: location.longitude,
    evidence: evidenceIds,
    address,
    evidence_ids: evidenceIds,
    user_id: userId
  })

  res.status(201).json({
    success: true,
    message: "Complaint created successfully",
    data: complaint
  });
});

const getComplaintById = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        throw new ApiError(400, "Invalid complaintId format");
    }

    const complaint = await Complaint.findById(complaintId)
        .populate("user_id", "name email")
        .populate("category_id", "name category_count")
        .populate("evidence_ids")
        .populate("voted_users", "name email profile_image")
        .populate("assigned_officer_id", "name email profile_image")
        .populate("feedback_id", "complaint_id rating comment createdAt updatedAt");

    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    if (req.user.role !== 'admin' && req.user._id.toString() !== complaint.user_id.toString()) {
        throw new ApiError(403, "You do not have permission to view this complaint");
    }

    res.status(200).json({
        success: true,
        data: complaint
    });
});

const getComplaintByUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const complaints = await Complaint.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .populate("user_id", "name email")
        .populate("category_id", "name category_count")
        .populate("evidence_ids")
        .populate("voted_users", "name email profile_image")
        .populate("assigned_officer_id", "name email profile_image")
        .populate("feedback_id", "complaint_id rating comment createdAt updatedAt");

    res.status(200).json({
        success: true,
        count: complaints.length,
        data: complaints
    });
})

const updateComplaintStatus = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        throw new ApiError(400, "Invalid complaintId format");
    }

    const validStatuses = ["pending", "in_progress", "resolved", "rejected"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`);
    }

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    complaint.status = status;
    await complaint.save();

    res.status(200).json({
        success: true,
        message: "Complaint status updated successfully",
        data: complaint
    });
})

const assignComplaintToDepartment = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { departmentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid complaint ID format.");
    }
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID format.");
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, "Department not found.");

    if (req.user.role != "admin") throw new ApiError(403, "You are not authorized to assign departments.");

    complaint.assignedDepartment = departmentId;
    await complaint.save();

    res.status(200).json({
        success: true,
        message: "Complaint assigned to department successfully.",
        data: complaint,
    })
})

const deleteComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        throw new ApiError(400, "Invalid complaint ID format.");
    }

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) throw new ApiError(404, "Complaint not found.");

    if (!complaint.user_id.equals(req.user._id) && req.user.role !== "admin") {
        throw new ApiError(403, "You are not authorized to delete this complaint.");
    }

    await complaint.deleteOne();

    res.status(200).json({
        success: true,
        message: "Complaint deleted successfully."
    });
});

const upvoteComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        throw new ApiError(400, "Invalid complaint ID format.")
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found.");
    }

    const existingVote = complaint.votedUsers.find((v) => v.user.equals(userId));

    if (existingVote) {
        if (existingVote.vote === "upvote") {
            throw new ApiError(400, "You have already upvoted this complaint.");
        }
        else if (existingVote.vote === "downvote") {
            complaint.downvote -= 1;
            existingVote.vote = "upvote";
            complaint.upvote += 1;
        }
    }
    else {
        complaint.upvote += 1;
        complaint.voted_users.push({ user: userId, vote: "upvote" });
    }

    await complaint.save();

    res.status(200).json({
        success: true,
        message: "Upvote recorded successfully.",
        data: complaint
    })
})

const downvoteComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        throw new ApiError(400, "Invalid complaint ID format.");
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found.")
    }

    const existingVote = complaint.votedUsers.find((v) =>
        v.user.equals(userId)
    );

    if (existingVote) {
        if (existingVote.vote === "downvote") {
        throw new ApiError(400, "You have already downvoted this complaint.");
        } else if (existingVote.vote === "upvote") {
        // Remove upvote & add downvote
        complaint.upvotes -= 1;
        existingVote.vote = "downvote";
        complaint.downvotes += 1;
        }
    } else {
        // First time voting: add downvote
        complaint.downvotes += 1;
        complaint.votedUsers.push({ user: userId, vote: "downvote" });
    }

    await complaint.save();

    res.status(200).json({
        success: true,
        message: "Downvote recorded successfully.",
        data: complaint,
    });
})

export {
    createComplaint,
    getComplaintById,
    getComplaintByUser,
    updateComplaintStatus,
    assignComplaintToDepartment,
    deleteComplaint,
    upvoteComplaint,
    downvoteComplaint,
}