import { Complaint } from "../models/complaint.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { complaintByCategoryPipeline, complaintByDate } from "../pipelines/complaint.pipeline.js";

/**
 * Get comprehensive complaint analytics for the user's area
 * Returns: category distribution, status distribution, trends, coordinates, engagement stats
 */
const getComplaintAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userLat = parseFloat(req.user.latitude);
    const userLon = parseFloat(req.user.longitude);

    // Validate user location
    if (!userLat || !userLon || isNaN(userLat) || isNaN(userLon)) {
        throw new ApiError(400, "User location not found. Please update your profile with location information.");
    }

    const radiusKm = 300;
    const radius = radiusKm * 1000;
    const radiusRadians = radius / 6378100;

    // Get category distribution using pipeline
    const result = await Complaint.aggregate(
        complaintByCategoryPipeline(userLat, userLon, radius)
    )

    const categories = ["rail", "fire", "cyber", "police", "court", "road"];

    const categoryDistribution = {};
    categories.forEach((cat) => (categoryDistribution[cat] = 0));
    result.forEach((item) => {
        categoryDistribution[item.category] = item.count;
    })

    // Calculate total complaints from category data
    const totalComplaints = Object.values(categoryDistribution).reduce((sum, count) => sum + count, 0);

    // Get all complaints within radius for additional stats
    const allComplaints = await Complaint.find({
        location: {
            $geoWithin: {
                $centerSphere: [
                    [userLon, userLat],
                    radiusRadians,
                ]
            }
        }
    }).lean();

    // Calculate resolution rate
    const resolvedCount = allComplaints.filter(c => c.status === 'resolved').length;
    const resolutionRate = totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).toFixed(1) : 0;

    // Calculate user's complaints count
    const userComplaintsCount = allComplaints.filter(c => 
        c.user_id && c.user_id.toString() === userId.toString()
    ).length;

    // Calculate engagement stats (upvotes/downvotes)
    const totalUpvotes = allComplaints.reduce((sum, c) => sum + (c.upvote || 0), 0);
    const totalDownvotes = allComplaints.reduce((sum, c) => sum + (c.downvote || 0), 0);
    const engagementRate = totalComplaints > 0 ? 
        (((totalUpvotes + totalDownvotes) / totalComplaints) * 100).toFixed(1) : 0;

    const dateWiseResult = await Complaint.aggregate(
        complaintByDate()
    )

    const dateMap = {};
    dateWiseResult.forEach((d) => (dateMap[d.date] = d.count));

    const last60Days = [];
    for (let i = 59; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const dateStr = dt.toISOString().split("T")[0];
        last60Days.push({
            date: dateStr,
            count: dateMap[dateStr] || 0,
        })
    }

    const nearbyCoordinates = allComplaints.map(c => ({
        longitude: c.location.coordinates[0],
        latitude: c.location.coordinates[1],
        category: c.category,
    }))

    // Calculate status distribution
    const statusMap = {};
    allComplaints.forEach(c => {
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
        percentage: ((count / totalComplaints) * 100).toFixed(1)
    }));

    return res.status(200).json({ 
        success: true, 
        data: {
            categoryDistribution,
            statusDistribution,
            totalComplaints,
            resolutionRate,
            userComplaintsCount,
            engagementStats: {
                totalUpvotes,
                totalDownvotes,
                engagementRate
            },
            complaintsByDate: last60Days,
            nearbyComplaintCoordinates: nearbyCoordinates,
        }
    });
});

export {
    getComplaintAnalytics
};
