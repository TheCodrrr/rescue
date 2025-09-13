import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Complaint } from "../models/complaint.models.js";
import mongoose from "mongoose";
import { ensureTrainExists, getTrainByNumber } from "../services/rail.service.js";
import { calculateTrendingScore } from "../../utils/trendingScore.js";
// import { Department } from "../models/department.models.js";
import { io } from "../server.js";

const getTrendingComplaints = asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;

    const query = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};

    let complaints = await Complaint.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit) + 1)
        .populate("user_id", "name profileImage")
        .lean();

    if (!complaints || complaints.length == 0) {
        return res.status(200).json({
            success: true,
            data: [],
            nextCursor: null,
            hasNextPage: false,
        });
    }

    complaints = complaints.map((c) => ({
        ...c,
        score: calculateTrendingScore(c),
    }));

    complaints.sort((a, b) => b.score - a.score);

    const hasNextPage = complaints.length > limit;
    const results = complaints.slice(0, limit);
    const nextCursor = hasNextPage ? results[results.length - 1].createdAt.toISOString() : null;

    res.status(200).json({
        success: true,
        data: results,
        nextCursor,
        hasNextPage,
    });
});

const getNearbyComplaints = asyncHandler(async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) return ApiError(400, "Latitude and longitude are required");

        const minsAgo = new Date(Date.now() - 30 * 60 * 1000);

        const complaints = await Complaint.find({
            createdAt: { $gte: minsAgo },
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    $maxDistance: 30000 // meters
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .lean();

        res.status(200).json({
            success: true,
            count: complaints.length,
            complaints
        });
    } catch (error) {
        console.error("Error in getNearbyComplaints: ", error);
        res.status(500).json({ success: false, error: error.message })
    }
})

const createComplaint = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // console.log('=== BACKEND REQUEST DEBUG ===');
  // console.log('Full req.body:', JSON.stringify(req.body, null, 2));
  // console.log('req.body keys:', Object.keys(req.body));

  const { title, description, category, location, address, evidenceIds = [], category_data_id, severity } = req.body;

  // console.log('Received complaint data:', { title, description, category, location, address, category_data_id, severity });
  // console.log('Location object:', JSON.stringify(location, null, 2));

  if (!title || !description || !category || !location || !address) {
    throw new ApiError(400, "All required fields (title, description, category, location, address) must be provided");
  }

  // Validate location structure
  if (!location.type || !location.coordinates) {
    // console.log('Location validation failed - missing type or coordinates:', location);
    throw new ApiError(400, "Location must have 'type' and 'coordinates' fields (GeoJSON format)");
  }

  if (location.type !== 'Point') {
    // console.log('Location type validation failed:', location.type);
    throw new ApiError(400, "Location type must be 'Point'");
  }

  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    // console.log('Location coordinates array validation failed:', location.coordinates);
    throw new ApiError(400, "Location coordinates must be an array of [longitude, latitude]");
  }

  const [lng, lat] = location.coordinates;
  // console.log('Extracted coordinates:', { lng, lat, lngType: typeof lng, latType: typeof lat });
  // console.log('Raw coordinates array:', location.coordinates);
  // console.log('isNaN checks:', { lngNaN: isNaN(lng), latNaN: isNaN(lat) });
  // console.log('Finite checks:', { lngFinite: Number.isFinite(lng), latFinite: Number.isFinite(lat) });
  
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat) || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    // console.log('Coordinate number validation failed:', { lng, lat, lngType: typeof lng, latType: typeof lat });
    throw new ApiError(400, `Location coordinates must be valid numbers. Received: lng=${lng} (${typeof lng}), lat=${lat} (${typeof lat})`);
  }

  if (!category) {
    throw new ApiError(400, "Invalid category: category does not exist");
  }

  let trainMatched = null; 
  if (category === "rail") {
    console.log("difhfbksdjnbnsdjnbsdjnbskdjnbkdjgbnksdjbnsdkjgbnsdjgbnsdgj")
    console.log("fjghkjlndfjvnsgnlsgnbldgbn")
    trainMatched = await ensureTrainExists(category_data_id);
    if (!trainMatched) {
      throw new ApiError(400, "Invalid train: train does not exist");
    }
  }

  const complaint = await Complaint.create({
    title,
    description,
    category,
    location: {
      type: location.type,
      coordinates: location.coordinates
    },
    address,
    evidence_ids: evidenceIds || [],
    user_id: userId,
    category_data_id: category_data_id || '',
    severity,
  })

  if (complaint) {
    console.log("Complaint created successfully, emitting to socket...");
    console.log("Complaint ID:", complaint._id);
    
    // Populate user information before emitting
    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate("user_id", "name email profileImage")
      .lean();
    
    console.log("Populated complaint:", JSON.stringify(populatedComplaint, null, 2));
    console.log("Emitting newComplaint event to all connected clients...");
    
    io.emit("newComplaint", populatedComplaint);
    console.log("Socket emit completed");
  }

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
        .populate("evidence_ids")
        .populate("votedUsers", "name email profileImage")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("feedback_ids", "complaint_id rating comment createdAt updatedAt");

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

    console.log(req.user);

    let complaints = await Complaint.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .populate("user_id", "name email")
        .populate("evidence_ids")
        .populate("votedUsers", "name email profileImage")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("feedback_ids", "complaint_id rating comment createdAt updatedAt")
        .lean(); // 👈 makes results plain JS objects instead of Mongoose docs

    console.log("These are the complaints, hello hello: ", complaints);

    complaints = await Promise.all(
        complaints.map(async complaint => {
            if (complaint.category === "rail") {
                const train = await getTrainByNumber(complaint.category_data_id);
                // add extra field safely
                return { ...complaint, category_specific_data: train };
            }
            return complaint;
        })
    );

    console.log("User ID:", userId);

    if (!complaints || complaints.length === 0) {
        throw new ApiError(404, "No complaints found for this user");
    }

    res.status(200).json({
        success: true,
        count: complaints.length,
        data: complaints
    });
});

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
        complaint.votedUsers.push({ user: userId, vote: "upvote" });
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
        complaint.upvote -= 1;
        existingVote.vote = "downvote";
        complaint.downvote += 1;
        }
    } else {
        // First time voting: add downvote
        complaint.downvote += 1;
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
    getTrendingComplaints,
    getNearbyComplaints
}