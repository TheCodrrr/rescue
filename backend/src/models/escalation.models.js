import mongoose, { Schema } from "mongoose"

const escalationSchema = new Schema({
    complaint_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint",
    },
    from_level: {
        type: Number,
        default: 1,
        min: 1,
    },
    to_level: {
        type: Number,
        default: 1,
        min: 1,
    },
    escalated_at: {
        type: Date,
        default: Date.now,
    },
    reason: {
        type: String,
        trim: true,
    },
    escalated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    }
})

export const Escalation = mongoose.model("escalation", escalationSchema);