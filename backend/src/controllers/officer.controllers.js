import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Complaint } from "../models/complaint.models.js";
import { getTrainByNumber } from "../services/rail.service.js";
import redisClient from "../../utils/redisClient.js";

/**
 * Redis Key Structure:
 * Key: `officer:${officerId}:rejected_complaints`
 * Value: Set of complaint IDs that the officer has rejected
 */

/**
 * Add a complaint to officer's rejected list in Redis
 * 
 * @route POST /api/v1/officer/reject-complaint
 * @access Protected (requires authentication)
 * @body { complaintId: string }
 */
const rejectComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.body;
    const officerId = req.user._id.toString();

    if (!complaintId) {
        throw new ApiError(400, "Complaint ID is required");
    }

    // Verify complaint exists
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }

    try {
        // Redis key for this officer's rejected complaints
        const redisKey = `officer:${officerId}:rejected_complaints`;
        
        // Add complaint ID to the set in Redis
        await redisClient.sAdd(redisKey, complaintId);
        
        // Set expiry to 2 hours (matching complaint fetch time window)
        await redisClient.expire(redisKey, 2 * 60 * 60);

        res.status(200).json({
            success: true,
            message: "Complaint rejected successfully",
            data: {
                complaint_id: complaintId,
                officer_id: officerId
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
        // Base query filter to exclude rejected complaints
        const baseFilter = {
            createdAt: { $gte: twoHoursAgo },
            ...(rejectedComplaintIds.length > 0 && { _id: { $nin: rejectedComplaintIds } })
        };

        // Query for complaints within 10km radius with severity "low"
        const lowSeverityComplaints = await Complaint.find({
            ...baseFilter,
            severity: "low",
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: 10000 // 10 km in meters
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("assigned_officer_id", "name email profileImage")
        .sort({ createdAt: -1 })
        .lean();

        // Query for complaints within 20km radius with severity "medium"
        const mediumSeverityComplaints = await Complaint.find({
            ...baseFilter,
            severity: "medium",
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: 20000 // 20 km in meters
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("assigned_officer_id", "name email profileImage")
        .sort({ createdAt: -1 })
        .lean();

        // Query for complaints within 100km radius with severity "high"
        const highSeverityComplaints = await Complaint.find({
            ...baseFilter,
            severity: "high",
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: 100000 // 100 km in meters
                }
            }
        })
        .populate("user_id", "name email profileImage")
        .populate("evidence_ids")
        .populate("assigned_officer_id", "name email profileImage")
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

export {
    getNearbyComplaintsForOfficer,
    rejectComplaint
};