import mongoose, { Schema } from "mongoose"

const evidenceSchema = new Schema({
    submitted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
        required: true,
    },
    evidence_type: {
        type: String,
        enum: ["image", "video", "text", "audio"],
        required: true,
    },
    evidence_url: {
        type: String,
        trim: true,
    }
}, { timestamps: true });

export const Evidence = mongoose.model("evidence", evidenceSchema);