import mongoose, { Schema } from "mongoose"

const escalationEventSchema = new Schema({
    from_level: {
        type: Number,
        default: 0,
        min: 0,
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

const escalationSchema = new Schema({
    complaint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint",
        required: true,
        unique: true,
    },
    history: [escalationEventSchema],
})

export const Escalation = mongoose.model("escalation", escalationSchema);