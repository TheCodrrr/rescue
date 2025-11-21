import { asyncHandler } from "../../utils/asyncHandler.js";
import { History } from "../models/history.models.js";

const addHistory = asyncHandler( async (req, res) => {
    try {
        const { user_id, actionType, complaint_id, category, previous_state, new_state, comment_id, details } = req.body;

        if (!user_id || !actionType) {
            return res.status(400).json({ message: "user_id and actionType are required." });
        }

        const history = await History.create({
            user_id,
            actionType,
            complaint_id: complaint_id || null,
            category: category || null,
            previous_state: previous_state || null,
            new_state: new_state || null,
            comment_id: comment_id || null,
            details: details || {},
        })

        return res.status(201).json({
            message: "History entry added successfully",
            history,
        })
    } catch (error) {
        console.error("Error adding history: ", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
} )

const deleteHistory = asyncHandler( async(req, res) => {
    try {
        const { id } = req.params;
        const deleted = await History.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "History entry not found" });
        }

        return res.status(200).json({ message: "History entry deleted successfully" })
    } catch (error) {
        console.error("Error deleting history:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
} )

const getHistory = asyncHandler( async(req, res) => {
    try {
        const {
            user_id,
            complaint_id,
            category,
            actionType,
            limit = 10,
            sort,
            cursor
        } = req.query;

        const filter = {};
        if (user_id) filter.user_id = user_id;
        if (complaint_id) filter.complaint_id = complaint_id;
        if (category && category !== 'all') filter.category = category;
        if (actionType && actionType !== 'all') filter.actionType = actionType;

        // Add cursor-based pagination
        if (cursor) {
            filter.timestamp = { $lt: new Date(cursor) };
        }

        // Get total count of matching records (for UI display)
        const totalCount = await History.countDocuments(
            user_id ? { user_id, ...(category && category !== 'all' ? { category } : {}), ...(actionType && actionType !== 'all' ? { actionType } : {}) } : filter
        );

        const sortOrder = sort === "asc" ? 1 : -1;
        const parsedLimit = Number(limit);

        // Fetch one extra record to determine if there's a next page
        let histories = await History.find(filter)
            .sort({ timestamp: sortOrder })
            .limit(parsedLimit + 1);

        // Check if there are more pages
        const hasNextPage = histories.length > parsedLimit;
        const results = histories.slice(0, parsedLimit);

        // Get the next cursor from the last record
        const nextCursor = hasNextPage && results.length > 0 
            ? results[results.length - 1].timestamp.toISOString() 
            : null;

        return res.status(200).json({
            success: true,
            count: results.length,
            totalCount: totalCount,
            histories: results,
            nextCursor,
            hasNextPage,
        })
    } catch (error) {
        console.error("Error fetching history:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
} )

const clearUserHistory = asyncHandler( async(req, res) => {
    try {
        const { user_id } = req.params;
        const result = await History.deleteMany({ user_id });

        return res.status(200).json({
            message: `Deleted ${result.deletedCount} history entries for user.`
        })
    } catch (error) {
        console.error("Error clearing user history:", error);
        return res.status(500).json({ message: "Server error", error: error.message })
    }
} )

export {
    addHistory,
    deleteHistory,
    getHistory,
    clearUserHistory
};