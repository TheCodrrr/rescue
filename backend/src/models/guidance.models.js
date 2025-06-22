import mongoose, { Schema } from "mongoose"

const guidanceSchema = new Schema({
    added_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    source_link_url: [{
        type: String
    }],
    verified: {
        type: Boolean,
        default: false,
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
    }
}, { timestamps: true })

export const Guidance = mongoose.model("guidance", guidanceSchema);