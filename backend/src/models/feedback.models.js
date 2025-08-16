import mongoose, { Schema } from "mongoose"

const feedbackSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    complaint_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint",
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },
    comment: {
        type: String,
        required: true,
    }
}, { timestamps: true })

export const Feedback = mongoose.model("feedback", feedbackSchema);