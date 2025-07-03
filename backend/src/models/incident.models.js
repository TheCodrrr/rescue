import mongoose, { Schema } from "mongoose"

const incidentSchema = new Schema({
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    assigned_officer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    evidence: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "evidence",
    }],
    description: {
        type: String,
        trim: true,
        required: true,
    },
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
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: function() {
            return this.verified;
        }
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
    votedUsers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        vote: { type: String, enum: ["upvote", "downvote"] }
    }],
    status: {
        type: String,
        enum: ["pending", "in_progress", "resolved", "rejected"],
        default: "pending"
    },
    category: {
        type: String,
        enum: ["rail", "fire", "cyber", "police", "court"],
        required: true,
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