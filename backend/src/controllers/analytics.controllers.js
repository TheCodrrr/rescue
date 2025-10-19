import { Complaint } from "../models/complaint.models.js";
import { Feedback } from "../models/feedback.models.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

/**
 * Get analytics data for complaints within 10km radius of user's location
 * Includes: category distribution, status breakdown, severity analysis, trending data, etc.
 */
const getNearbyAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get user's location
    const user = await User.findById(userId).select('latitude longitude');
    
    console.log("User location data:", { userId, latitude: user?.latitude, longitude: user?.longitude });
    
    if (!user || !user.latitude || !user.longitude) {
        throw new ApiError(400, "User location not found. Please update your profile with location information.");
    }

    const userLat = user.latitude;
    const userLng = user.longitude;

    // 10km in radians (Earth's radius is ~6371km)
    const radiusInRadians = 10 / 6371;

    console.log("Searching for complaints with query:", {
        userLat,
        userLng,
        radiusInRadians,
        radiusInKm: 10
    });

    // First, let's check total complaints without location filter
    const totalComplaintsInDb = await Complaint.countDocuments();
    console.log("Total complaints in database:", totalComplaintsInDb);

    // Check complaints with location data
    const complaintsWithLocation = await Complaint.countDocuments({
        'location.coordinates': { $exists: true, $ne: null }
    });
    console.log("Complaints with location data:", complaintsWithLocation);

    // Sample a few complaints to see their location structure
    const sampleComplaints = await Complaint.find().limit(3).select('location address').lean();
    console.log("Sample complaint locations:", JSON.stringify(sampleComplaints, null, 2));

    // SIMPLIFIED APPROACH: Get ALL complaints and filter manually
    // This ensures we get data even if geospatial index isn't working
    console.log("Fetching all complaints for manual filtering...");
    
    const allComplaints = await Complaint.find({})
        .populate('user_id', 'name profileImage')
        .populate('feedback_ids')
        .lean();

    console.log("Total complaints fetched:", allComplaints.length);

    // Manual distance calculation using Haversine formula
    const nearbyComplaints = allComplaints.filter(complaint => {
        // Check if complaint has location data
        if (!complaint.location || !complaint.location.coordinates || complaint.location.coordinates.length < 2) {
            console.log(`Complaint "${complaint.title}" has no valid location data`);
            return false;
        }

        const [cLng, cLat] = complaint.location.coordinates;
        
        // Validate coordinates are numbers
        if (typeof cLng !== 'number' || typeof cLat !== 'number' || isNaN(cLng) || isNaN(cLat)) {
            console.log(`Complaint "${complaint.title}" has invalid coordinates:`, [cLng, cLat]);
            return false;
        }
        
        // Haversine formula to calculate distance
        const R = 6371; // Earth's radius in km
        const dLat = (cLat - userLat) * Math.PI / 180;
        const dLng = (cLng - userLng) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        console.log(`Complaint "${complaint.title}":`, {
            coordinates: [cLng, cLat],
            distance: distance.toFixed(2) + 'km',
            withinRadius: distance <= 10
        });

        return distance <= 10;
    });

    console.log("=== FILTERING COMPLETE ===");
    console.log("Nearby complaints within 10km:", nearbyComplaints.length);

    if (!nearbyComplaints || nearbyComplaints.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, {
                totalComplaints: 0,
                categoryDistribution: [],
                statusDistribution: [],
                severityDistribution: [],
                timeSeriesData: [],
                topLocations: [],
                averageRating: 0,
                responseTimeStats: {},
                userComplaintsCount: 0,
                recentComplaints: []
            }, "No complaints found in your area")
        );
    }

    // Calculate various analytics

    // 1. Total complaints count
    const totalComplaints = nearbyComplaints.length;

    // 2. Category distribution
    const categoryMap = {};
    nearbyComplaints.forEach(c => {
        categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
    });
    const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({
        category,
        count,
        percentage: ((count / totalComplaints) * 100).toFixed(1)
    }));

    // 3. Status distribution
    const statusMap = {};
    nearbyComplaints.forEach(c => {
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
        percentage: ((count / totalComplaints) * 100).toFixed(1)
    }));

    // 4. Severity distribution
    const severityMap = {};
    nearbyComplaints.forEach(c => {
        severityMap[c.severity] = (severityMap[c.severity] || 0) + 1;
    });
    const severityDistribution = Object.entries(severityMap).map(([severity, count]) => ({
        severity,
        count,
        percentage: ((count / totalComplaints) * 100).toFixed(1)
    }));

    // 5. Time series data (complaints per month for last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = {};
    nearbyComplaints.forEach(c => {
        if (new Date(c.createdAt) >= sixMonthsAgo) {
            const month = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        }
    });
    
    const timeSeriesData = Object.entries(monthlyData).map(([month, count]) => ({
        month,
        count
    }));

    // 6. Top complaint locations (by address)
    const locationMap = {};
    nearbyComplaints.forEach(c => {
        if (c.address) {
            const shortAddress = c.address.split(',').slice(0, 2).join(',').trim();
            locationMap[shortAddress] = (locationMap[shortAddress] || 0) + 1;
        }
    });
    const topLocations = Object.entries(locationMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }));

    // 7. Average rating from feedbacks
    let totalRating = 0;
    let ratingCount = 0;
    nearbyComplaints.forEach(c => {
        if (c.feedback_ids && c.feedback_ids.length > 0) {
            c.feedback_ids.forEach(feedback => {
                if (feedback.rating) {
                    totalRating += feedback.rating;
                    ratingCount++;
                }
            });
        }
    });
    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;

    // 8. Response time statistics (time from creation to first status change)
    const responseTimes = [];
    nearbyComplaints.forEach(c => {
        if (c.status !== 'pending' && c.updatedAt && c.createdAt) {
            const responseTime = (new Date(c.updatedAt) - new Date(c.createdAt)) / (1000 * 60 * 60); // in hours
            responseTimes.push(responseTime);
        }
    });
    
    const responseTimeStats = {
        average: responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : 0,
        min: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0
    };

    // 9. User's complaints in the area
    const userComplaintsCount = nearbyComplaints.filter(c => 
        c.user_id && c.user_id._id.toString() === userId.toString()
    ).length;

    // 10. Recent complaints (last 10)
    const recentComplaints = nearbyComplaints
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(c => ({
            _id: c._id,
            title: c.title,
            category: c.category,
            status: c.status,
            severity: c.severity,
            createdAt: c.createdAt,
            upvote: c.upvote || 0,
            downvote: c.downvote || 0
        }));

    // 11. Upvote/Downvote statistics
    const totalUpvotes = nearbyComplaints.reduce((sum, c) => sum + (c.upvote || 0), 0);
    const totalDownvotes = nearbyComplaints.reduce((sum, c) => sum + (c.downvote || 0), 0);
    const engagementRate = totalComplaints > 0 ? 
        (((totalUpvotes + totalDownvotes) / totalComplaints) * 100).toFixed(1) : 0;

    // 12. Resolution rate
    const resolvedCount = nearbyComplaints.filter(c => c.status === 'resolved').length;
    const resolutionRate = ((resolvedCount / totalComplaints) * 100).toFixed(1);

    // 13. Category-wise status breakdown
    const categoryStatusBreakdown = {};
    nearbyComplaints.forEach(c => {
        if (!categoryStatusBreakdown[c.category]) {
            categoryStatusBreakdown[c.category] = {
                pending: 0,
                in_progress: 0,
                resolved: 0,
                rejected: 0
            };
        }
        categoryStatusBreakdown[c.category][c.status]++;
    });

    // 14. Severity trend over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const severityTrend = {
        high: 0,
        medium: 0,
        low: 0
    };
    
    nearbyComplaints.forEach(c => {
        if (new Date(c.createdAt) >= thirtyDaysAgo) {
            severityTrend[c.severity]++;
        }
    });

    return res.status(200).json(
        new ApiResponse(200, {
            totalComplaints,
            categoryDistribution,
            statusDistribution,
            severityDistribution,
            timeSeriesData,
            topLocations,
            averageRating: parseFloat(averageRating),
            responseTimeStats,
            userComplaintsCount,
            recentComplaints,
            engagementStats: {
                totalUpvotes,
                totalDownvotes,
                engagementRate: parseFloat(engagementRate)
            },
            resolutionRate: parseFloat(resolutionRate),
            categoryStatusBreakdown,
            severityTrend,
            userLocation: {
                latitude: userLat,
                longitude: userLng
            },
            radius: 10 // km
        }, "Analytics data fetched successfully")
    );
});

export {
    getNearbyAnalytics
};
