import mongoose, { Schema } from "mongoose"

const categorySchema = new Schema({
    name: {
        type: String,
        enum: ["rail", "fire", "cyber", "police", "court"],
    },
    category_count: {
        type: Number,
        default: 0,
    }
})

export const Category = mongoose.model("Category", categorySchema);