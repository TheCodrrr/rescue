import mongoose, { Schema } from "mongoose"

const feedbackSchema = new mongoose.Schema({
    complaint_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint",
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },
    comment: {
        type: String,
    }
}, { timestamps: true })

export const Feedback = mongoose.model("feedback", feedbackSchema);