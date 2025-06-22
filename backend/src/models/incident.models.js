import mongoose, { Schema } from "mongoose"

const incidentSchema = new Schema({
    reporter_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    assigned_officer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    evidence_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "evidence",
    }],
    latitude: Number,
    longitude: Number,
    address: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "resolved", "rejected"],
    },
    incident_timestamp: {
        type: Date,
        default: Date.now,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    upvote: {
        type: Number,
        default: 0,
        min: 0,
    },
    downvote: {
        type: Number,
        default: 0,
        min: 0,
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
    },
    priority: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
    },
    officer_notes: {
        type: String,
        trim: true,
    }
}, { timestamps: true })

export const Incident = mongoose.model("incident", incidentSchema);