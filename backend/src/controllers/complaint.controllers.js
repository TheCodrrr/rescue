import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Complaint } from "../models/complaint.models.js";
import mongoose from "mongoose";
import { ensureTrainExists, getTrainByNumber } from "../services/rail.service.js";
import { calculateTrendingScore } from "../../utils/trendingScore.js";
// import { Department } from "../models/department.models.js";
import { io } from "../server.js";
import { History } from "../models/history.models.js";

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
    // console.log("difhfbksdjnbnsdjnbsdjnbskdjnbkdjgbnksdjbnsdkjgbnsdjgbnsdgj")
    // console.log("fjghkjlndfjvnsgnlsgnbldgbn")
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
    // Add history entry for complaint registration
    try {
      await History.create({
        user_id: userId,
        actionType: 'COMPLAINT_REGISTERED',
        complaint_id: complaint._id,
        category: category,
        details: {
          title: title,
          category: category,
          severity: severity,
          location: address
        }
      });
    } catch (historyError) {
      console.error("Error adding history entry:", historyError);
      // Don't fail the complaint creation if history fails
    }

    // console.log("Complaint created successfully, emitting to socket...");
    // console.log("Complaint ID:", complaint._id);
    
    // Populate user information before emitting
    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate("user_id", "name email profileImage")
      .lean();
    
    // Add train data if it's a rail complaint
    let enrichedComplaint = populatedComplaint;
    if (populatedComplaint.category === "rail" && populatedComplaint.category_data_id) {
      try {
        const train = await getTrainByNumber(populatedComplaint.category_data_id);
        if (train && train.stations) {
          const stations = typeof train.stations === 'string' 
            ? JSON.parse(train.stations) 
            : train.stations;
          enrichedComplaint = { ...populatedComplaint, category_specific_data: { ...train, stations } };
        } else {
          enrichedComplaint = { ...populatedComplaint, category_specific_data: train };
        }
      } catch (error) {
        console.error("Error fetching train data for socket emit:", error);
      }
    }
    
    // console.log("Populated complaint:", JSON.stringify(populatedComplaint, null, 2));
    // console.log("Emitting newComplaint event to all connected clients...");
    
    // Emit general complaint event
    io.emit("newComplaint", enrichedComplaint);
    
    // Emit specific event for officers with severity and location info
    io.emit("newComplaintForOfficer", {
      complaint: enrichedComplaint,
      location: enrichedComplaint.location,
      severity: enrichedComplaint.severity,
      category: enrichedComplaint.category,
      timestamp: enrichedComplaint.createdAt
    });
    
    // console.log("Socket emit completed");
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

    let complaint = await Complaint.findById(complaintId)
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("votedUsers", "name email profileImage")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("feedback_ids", "complaint_id rating comment createdAt updatedAt")
        .lean();

    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    if (req.user.role !== 'admin' && req.user.role !== 'officer' && req.user._id.toString() !== complaint.user_id._id.toString()) {
        throw new ApiError(403, "You do not have permission to view this complaint");
    }

    // Add category-specific data if available
    if (complaint.category === "rail" && complaint.category_data_id) {
        try {
            const train = await getTrainByNumber(complaint.category_data_id);
            if (train && train.stations) {
                // Parse stations if it's a JSON string
                const stations = typeof train.stations === 'string' 
                    ? JSON.parse(train.stations) 
                    : train.stations;
                complaint = { ...complaint, category_specific_data: { ...train, stations } };
            } else {
                complaint = { ...complaint, category_specific_data: train };
            }
        } catch (error) {
            console.error("Error fetching train data:", error);
            // Continue without train data if there's an error
        }
    }

    res.status(200).json({
        success: true,
        data: complaint
    });
});

const getComplaintByUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // console.log(req.user);

    let complaints = await Complaint.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .populate("user_id", "name email")
        .populate("evidence_ids")
        .populate("votedUsers", "name email profileImage")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("feedback_ids", "complaint_id rating comment createdAt updatedAt")
        .lean(); // 👈 makes results plain JS objects instead of Mongoose docs

    // console.log("These are the complaints, hello hello: ", complaints);

    complaints = await Promise.all(
        complaints.map(async complaint => {
            // Determine current user's vote status
            const userVote = complaint.votedUsers.find(vote => 
                vote.user && vote.user._id.toString() === userId.toString()
            );
            
            if (complaint.category === "rail") {
                const train = await getTrainByNumber(complaint.category_data_id);
                if (train && train.stations) {
                    // Parse stations if it's a JSON string
                    const stations = typeof train.stations === 'string' 
                        ? JSON.parse(train.stations) 
                        : train.stations;
                    // add extra field safely with stations
                    return { 
                        ...complaint, 
                        category_specific_data: { ...train, stations },
                        userVote: userVote ? userVote.vote : null,
                        comments: complaint.feedback_ids || [] // Add comments field for frontend compatibility
                    };
                } else {
                    return { 
                        ...complaint, 
                        category_specific_data: train,
                        userVote: userVote ? userVote.vote : null,
                        comments: complaint.feedback_ids || [] // Add comments field for frontend compatibility
                    };
                }
            }
            return {
                ...complaint,
                userVote: userVote ? userVote.vote : null,
                comments: complaint.feedback_ids || [] // Add comments field for frontend compatibility
            };
        })
    );

    // console.log("User ID:", userId);

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

    // Use updateOne to bypass validation on other fields
    await Complaint.updateOne(
        { _id: complaintId },
        { 
            upvote: complaint.upvote,
            downvote: complaint.downvote,
            votedUsers: complaint.votedUsers
        }
    );

    // Determine current user's vote status
    const userVote = complaint.votedUsers.find(vote => 
        vote.user && vote.user.toString() === userId.toString()
    );

    res.status(200).json({
        success: true,
        message: "Upvote recorded successfully.",
        data: {
            upvote: complaint.upvote,
            downvote: complaint.downvote,
            userVote: userVote ? userVote.vote : null
        }
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

    // Use updateOne to bypass validation on other fields
    await Complaint.updateOne(
        { _id: complaintId },
        { 
            upvote: complaint.upvote,
            downvote: complaint.downvote,
            votedUsers: complaint.votedUsers
        }
    );

    // Determine current user's vote status
    const userVote = complaint.votedUsers.find(vote => 
        vote.user && vote.user.toString() === userId.toString()
    );

    res.status(200).json({
        success: true,
        message: "Downvote recorded successfully.",
        data: {
            upvote: complaint.upvote,
            downvote: complaint.downvote,
            userVote: userVote ? userVote.vote : null
        }
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