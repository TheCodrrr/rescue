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
        limit,
        sort,
        } = req.query;

        const filter = {};
        if (user_id) filter.user_id = user_id;
        if (complaint_id) filter.complaint_id = complaint_id;
        if (category) filter.category = category;
        if (actionType) filter.actionType = actionType;

        const sortOrder = sort === "asc" ? 1 : -1;
        const histories = await History.find(filter)
            .sort({ timestamp: sortOrder })
            .limit(Number(limit) || 0); // 0 = no limit

        return res.status(200).json({
            count: histories.length,
            histories,
        })
    } catch (error) {
        console.error("Error fetching history:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
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