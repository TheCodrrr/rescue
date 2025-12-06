import mongoose, { Schema } from "mongoose";

const teamSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    category: {
        type: String,
        enum: ["rail", "fire", "cyber", "police", "court", "road"],
        required: true,
    },
    department_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "department",
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        validate: async function (memberId) {
            const user = await mongoose.model("user").findById(memberId);
            return user?.role === "officer";
        }
    }],

    assigned_complaints: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "complaint"
    }],
    team_level: {
        type: Number,
        min: 1,
        max: 5,
        default: 1,
    },
}, { timestamps: true });

export const Team = mongoose.model("team", teamSchema);