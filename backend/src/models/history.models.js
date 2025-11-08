import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    actionType: {
        type: String,
        enum: [
             "COMPLAINT_REGISTERED",
            "COMPLAINT_STATUS_UPDATED",
            "COMPLAINT_UPVOTED",
            "COMPLAINT_DOWNVOTED",
            "COMPLAINT_ESCALATED",
            "COMMENT_ADDED",
            "COMMENT_EDITED",
            "COMMENT_DELETED",
            "USER_DETAILS_UPDATED",
        ],
        required: true,
    },
    complaint_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint",
        default: null,
    },
    category: {
        type: String,
        enum: ["rail", "road", "fire", "cyber", "police", "court"],
        default: null,
    },
    previous_state: {
        type: Object,
        default: null,
    },
    new_state: {
        type: Object,
        default: null,
    },
    comment_id: {
        type: String,
        default: null,
    },
    details: {
        type: Object,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { timestamps: true })

historySchema.index({ user_id: 1, timestamp: -1 });          // user’s history (sorted by time)
historySchema.index({ complaint_id: 1, timestamp: -1 });     // complaint-specific history
historySchema.index({ category: 1, timestamp: -1 });         // category filter
historySchema.index({ actionType: 1 });                      // action type filter
historySchema.index({ user_id: 1, actionType: 1, timestamp: -1 }); // combo index for dashboard queries

export const History = mongoose.model("history", historySchema);