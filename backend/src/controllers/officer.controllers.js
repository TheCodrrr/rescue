import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Complaint } from "../models/complaint.models.js";
import { getTrainByNumber } from "../services/rail.service.js";
import redisClient from "../../utils/redisClient.js";
import { User } from "../models/user.models.js";
import { Escalation } from "../models/escalation.models.js";
import { scheduleEscalation, cancelEscalation } from "../../utils/scheduleEscalation.js";
import { createNotification } from "./user.controllers.js";
import { io } from "../server.js";

/**
 * Redis Key Structure:
 * Key: `officer:${officerId}:rejected_complaints`
 * Value: Set of complaint IDs that the officer has rejected
 */

/**
 * Add a complaint to officer's rejected list in Redis and store rejection data
 * 
 * @route POST /api/v1/officer/reject-complaint
 * @access Protected (requires authentication)
 * @body { complaintId: string, reason: string }
 */
const rejectComplaint = asyncHandler(async (req, res) => {
    const { complaintId, reason } = req.body;
    const officerId = req.user._id.toString();

    if (!complaintId) {
        throw new ApiError(400, "Complaint ID is required");
    }

    if (!reason || reason.trim() === '') {
        throw new ApiError(400, "Rejection reason is required");
    }

    // Verify complaint exists
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    // Check if officer already rejected this complaint
    const alreadyRejected = complaint.rejections.some(
        rejection => rejection.officer_id.toString() === officerId
    );

    if (alreadyRejected) {
        throw new ApiError(400, "You have already rejected this complaint");
    }

    try {
        // Add rejection data to complaint schema
        complaint.rejections.push({
            officer_id: officerId,
            reason: reason.trim(),
            rejected_at: new Date()
        });

        // Check if 3 or more distinct officers have rejected this complaint
        const distinctOfficerRejections = new Set(
            complaint.rejections.map(rejection => rejection.officer_id.toString())
        );

        let statusChanged = false;
        if (distinctOfficerRejections.size >= 3 && complaint.status === 'pending') {
            // Change status to rejected if 3 or more distinct officers rejected it
            complaint.status = 'rejected';
            complaint.active = false; // Also mark as inactive so it doesn't appear in queries
            statusChanged = true;
            console.log(`Complaint ${complaintId} status changed to 'rejected' after ${distinctOfficerRejections.size} officer rejections`);
            
            // Cancel the escalation job for this complaint
            try {
                const cancelResult = await cancelEscalation(complaintId);
                if (cancelResult.success) {
                    console.log(`✅ Escalation timer cancelled for rejected complaint ${complaintId}`);
                } else {
                    console.log(`⚠️ Could not cancel escalation: ${cancelResult.message}`);
                }
            } catch (escalationError) {
                console.error(`Error cancelling escalation for complaint ${complaintId}:`, escalationError);
                // Continue even if escalation cancellation fails
            }
        }

        await complaint.save();

        // Redis key for this officer's rejected complaints
        const redisKey = `officer:${officerId}:rejected_complaints`;
        
        // Add complaint ID to the set in Redis
        await redisClient.sAdd(redisKey, complaintId);
        
        // Set expiry to 2 hours (matching complaint fetch time window)
        await redisClient.expire(redisKey, 2 * 60 * 60);

        // Get officer details for notification
        const officer = await User.findById(officerId).select('name');

        // If status changed to rejected, notify the complaint owner
        if (statusChanged) {
            try {
                const userId = complaint.user_id.toString();
                
                const notificationData = {
                    type: "complaint_rejected",
                    complaint_id: complaintId,
                    complaint_title: complaint.title,
                    message: `Your complaint has been rejected by multiple officers`,
                    rejection_count: distinctOfficerRejections.size,
                    status: "rejected",
                    timestamp: new Date().toISOString(),
                    read: false
                };

                await createNotification(userId, notificationData);
                
                // Emit real-time notification to the specific user
                io.emit(`notification:${userId}`, notificationData);
                console.log(`🔔 Rejection notification sent to user ${userId}`);
            } catch (notificationError) {
                console.error("⚠️ Failed to send rejection notification:", notificationError);
                // Continue even if notification fails
            }
        }

        res.status(200).json({
            success: true,
            message: statusChanged 
                ? "Complaint rejected by multiple officers and status updated" 
                : "Complaint rejected successfully",
            data: {
                complaint_id: complaintId,
                officer_id: officerId,
                officer_name: officer?.name || 'Officer',
                reason: reason.trim(),
                rejected_at: new Date(),
                total_rejections: distinctOfficerRejections.size,
                status_changed: statusChanged,
                new_status: complaint.status
            }
        });
    } catch (error) {
        console.error("Error rejecting complaint:", error);
        throw new ApiError(500, `Error rejecting complaint: ${error.message}`);
    }
});

/**
 * Get nearby complaints for officers based on their location
 * 
 * This function retrieves complaints from the last 2 hours within different radius zones
 * based on severity levels:
 * - Low severity: within 10km radius
 * - Medium severity: within 20km radius  
 * - High severity: within 100km radius
 * 
 * For rail complaints, it also includes train details with all stations.
 * 
 * Real-time updates: Officers should listen to the socket event 'newComplaintForOfficer'
 * to receive new complaints as they are created.
 * 
 * @route GET /api/v1/officer/nearby-complaints?latitude={lat}&longitude={lng}
 * @access Protected (requires authentication)
 */
const getNearbyComplaintsForOfficer = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query;
    const officerId = req.user._id.toString();

    if (!latitude || !longitude) {
        throw new ApiError(400, "Latitude and longitude are required");
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
        throw new ApiError(400, "Invalid latitude or longitude");
    }

    // Get complaints from the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Get rejected complaint IDs from Redis for this officer
    const redisKey = `officer:${officerId}:rejected_complaints`;
    let rejectedComplaintIds = [];
    try {
        rejectedComplaintIds = await redisClient.sMembers(redisKey);
    } catch (error) {
        console.warn("Could not fetch rejected complaints from Redis:", error);
        // Continue without filtering if Redis fails
    }

    try {
        // Base query filter to exclude rejected complaints and only show active complaints
        const baseFilter = {
            createdAt: { $gte: twoHoursAgo },
            active: true, // Only show complaints that haven't been accepted by other officers
            ...(rejectedComplaintIds.length > 0 && { _id: { $nin: rejectedComplaintIds } })
        };

        // Query for complaints within 10km radius with severity "low"
        const lowSeverityComplaints = await Complaint.find({
            ...baseFilter,
            severity: "low",
            location: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], 10 / 6378.1] // 10 km radius (Earth radius = 6378.1 km)
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("escalation_id")
        .sort({ createdAt: -1 })
        .lean();

        // Query for complaints within 20km radius with severity "medium"
        const mediumSeverityComplaints = await Complaint.find({
            ...baseFilter,
            severity: "medium",
            location: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], 20 / 6378.1] // 20 km radius
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("escalation_id")
        .sort({ createdAt: -1 })
        .lean();

        // Query for complaints within 100km radius with severity "high"
        const highSeverityComplaints = await Complaint.find({
            ...baseFilter,
            severity: "high",
            location: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], 200 / 6378.1] // 200 km radius (increased for better coverage)
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("escalation_id")
        .sort({ createdAt: -1 })
        .lean();

        // Enrich rail complaints with train data including stations
        const enrichComplaintsWithTrainData = async (complaints) => {
            return await Promise.all(
                complaints.map(async complaint => {
                    if (complaint.category === "rail" && complaint.category_data_id) {
                        try {
                            const train = await getTrainByNumber(complaint.category_data_id);
                            if (train && train.stations) {
                                const stations = typeof train.stations === 'string' 
                                    ? JSON.parse(train.stations) 
                                    : train.stations;
                                return { ...complaint, category_specific_data: { ...train, stations } };
                            } else {
                                return { ...complaint, category_specific_data: train };
                            }
                        } catch (error) {
                            console.error("Error fetching train data:", error);
                            return complaint;
                        }
                    }
                    return complaint;
                })
            );
        };

        // Enrich all complaint groups with train data
        const enrichedLowComplaints = await enrichComplaintsWithTrainData(lowSeverityComplaints);
        const enrichedMediumComplaints = await enrichComplaintsWithTrainData(mediumSeverityComplaints);
        const enrichedHighComplaints = await enrichComplaintsWithTrainData(highSeverityComplaints);

        // Calculate total counts
        const totalCount = enrichedLowComplaints.length + enrichedMediumComplaints.length + enrichedHighComplaints.length;

        res.status(200).json({
            success: true,
            timestamp: Date.now(),
            officer_location: { latitude: lat, longitude: lng },
            total_complaints: totalCount,
            data: {
                low_severity: {
                    radius_km: 10,
                    count: enrichedLowComplaints.length,
                    complaints: enrichedLowComplaints
                },
                medium_severity: {
                    radius_km: 20,
                    count: enrichedMediumComplaints.length,
                    complaints: enrichedMediumComplaints
                },
                high_severity: {
                    radius_km: 100,
                    count: enrichedHighComplaints.length,
                    complaints: enrichedHighComplaints
                }
            }
        });
    } catch (error) {
        console.error("Error in getNearbyComplaintsForOfficer:", error);
        throw new ApiError(500, `Error fetching nearby complaints: ${error.message}`);
    }
});

const assignOfficerToComplaint = asyncHandler(async (req, res) => {
    try {
        const { complaintId, officerId } = req.params;

        if (!complaintId || !officerId) {
            throw new ApiError(400, "Complaint ID and Officer ID are required");
        }

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            throw new ApiError(404, "Complaint not found");
        }

        const officer = await User.findById(officerId);
        if (!officer || officer.role !== "officer") {
            throw new ApiError(400, "Invalid officer ID or user is not an officer");
        }

        // Update complaint status and assignment
        complaint.assigned_officer_id = officerId;
        complaint.status = "in_progress";
        complaint.active = false; // Prevent other officers from accepting
        
        // Store previous level for escalation history
        const previousLevel = complaint.level;
        
        await complaint.save();

        // Update officer's complaint list
        if (!officer.complaints) officer.complaints = [];
        if (!officer.complaints.includes(complaint._id)) {
            officer.complaints.push(complaint._id);
            await officer.save();
        }

        // Handle escalation rescheduling
        try {
            // Find or create escalation record
            let escalation = await Escalation.findOne({ complaint: complaint._id });
            
            if (escalation) {
                // Add escalation event to history
                escalation.history.push({
                    from_level: previousLevel,
                    to_level: complaint.level,
                    reason: `Officer accepted complaint`,
                    escalated_by: officerId,
                    escalated_at: new Date()
                });
                await escalation.save();
            }
            
            // Reschedule escalation with new level (level 1 -> 2 based on severity)
            await scheduleEscalation(complaint);
            console.log(`Rescheduled escalation for complaint ${complaint._id} after officer acceptance`);
        } catch (escalationError) {
            console.error("Error rescheduling escalation:", escalationError);
            // Don't fail the assignment if escalation rescheduling fails
        }

        // Create notification for the citizen who registered the complaint
        try {
            const userId = complaint.user_id.toString();
            
            const notificationData = {
                type: "officer_assigned",
                complaint_id: complaintId,
                complaint_title: complaint.title,
                officer_name: officer.name || "Officer",
                officer_id: officerId,
                status: "in_progress",
                timestamp: new Date().toISOString(),
                read: false
            };

            await createNotification(userId, notificationData);
            
            // Emit real-time notification to the specific user (complaint owner)
            io.emit(`notification:${userId}`, notificationData);
            console.log(`🔔 Officer acceptance notification sent to user ${userId}`);
            
            // Emit real-time event to inform that complaint is now accepted (for other officers)
            io.emit('complaintAccepted', {
                complaint_id: complaintId,
                officer_id: officerId,
                officer_name: officer.name || "Officer",
                timestamp: new Date().toISOString()
            });
            console.log(`🔔 Complaint accepted event broadcasted to all officers for complaint ${complaintId}`);
            
        } catch (notificationError) {
            console.error("⚠️ Failed to send notification:", notificationError);
            // Continue even if notification fails - don't break the assignment
        }

        return res.status(200).json({
            message: "Officer successfully assigned to complaint",
            complaint,
        })
    } catch (error) {
        console.error("Error assigning officer: ", error);
        return ApiError(500, error.message);
    }
})

const getOfficerAcceptedComplaints = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { cursor, limit = 9, search = '', category = 'all' } = req.query;

    // Check if user is an officer
    if (userRole !== 'officer') {
        throw new ApiError(403, "Only officers can access this endpoint");
    }

    // Build base query for complaints assigned to this officer
    const query = { assigned_officer_id: userId };
    
    // Add category filter if not 'all'
    if (category !== 'all') {
        query.category = category;
    }

    // Add search filter if provided
    if (search && search.trim() !== '') {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Add cursor-based pagination
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }

    // Get total count for this query
    const totalCount = await Complaint.countDocuments(query);

    // Fetch one extra to check if there are more pages
    let complaints = await Complaint.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit) + 1)
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("votedUsers", "name email profileImage")
        .populate("assigned_officer_id", "name email profileImage")
        .populate("feedback_ids", "complaint_id rating comment createdAt updatedAt")
        .lean();

    // Check if there are more pages
    const hasNextPage = complaints.length > limit;
    const results = complaints.slice(0, limit);

    // Process complaints with category-specific data
    const processedComplaints = await Promise.all(
        results.map(async complaint => {
            // Determine current user's vote status
            const userVote = complaint.votedUsers.find(vote => 
                vote.user && vote.user._id.toString() === userId.toString()
            );
            
            if (complaint.category === "rail") {
                const train = await getTrainByNumber(complaint.category_data_id);
                if (train && train.stations) {
                    const stations = typeof train.stations === 'string' 
                        ? JSON.parse(train.stations) 
                        : train.stations;
                    return { 
                        ...complaint, 
                        category_specific_data: { ...train, stations },
                        userVote: userVote ? userVote.vote : null,
                        comments: complaint.feedback_ids || []
                    };
                } else {
                    return { 
                        ...complaint, 
                        category_specific_data: train,
                        userVote: userVote ? userVote.vote : null,
                        comments: complaint.feedback_ids || []
                    };
                }
            }
            return {
                ...complaint,
                userVote: userVote ? userVote.vote : null,
                comments: complaint.feedback_ids || []
            };
        })
    );

    // Get the next cursor from the last complaint
    const nextCursor = hasNextPage && results.length > 0 
        ? results[results.length - 1].createdAt.toISOString() 
        : null;

    res.status(200).json({
        success: true,
        count: processedComplaints.length,
        totalCount: totalCount,
        data: processedComplaints,
        nextCursor,
        hasNextPage
    });
});

export {
    getNearbyComplaintsForOfficer,
    rejectComplaint,
    assignOfficerToComplaint,
    getOfficerAcceptedComplaints,
};