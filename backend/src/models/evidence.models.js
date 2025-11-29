import mongoose, { Schema } from "mongoose"

const evidenceSchema = new Schema({
    complaint_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint",
        required: true,
    },
    submitted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    submitted_by_role: {
        type: String,
        enum: ['citizen', 'officer', 'admin'],
        required: true,
    },
    category: {
        type: String,
        enum: ['rail', 'fire', 'cyber', 'police', 'court', 'road'],
        required: true,
    },
    evidence_type: {
        type: String,
        enum: ["image", "video", "text", "audio", "document"],
        required: true,
    },
    evidence_url: {
        type: String,
        trim: true,
        required: true,
    },
    file_name: {
        type: String,
        trim: true,
    },
    file_size: {
        type: Number,
    },
    mime_type: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    public_id: {
        type: String,
        trim: true,
    }
}, { timestamps: true });

export const Evidence = mongoose.model("evidence", evidenceSchema);