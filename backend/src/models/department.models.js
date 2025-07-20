import mongoose, { Schema } from "mongoose"

const departmentSchema = new Schema({
    category: {
        type: String,
        enum: ['rail', 'fire', 'cyber', 'police', 'court'],
        required: true,
    },
    name: {
        type: String,
        trim: true,
    },
    contact_email: {
        type: String,
        unique: true,
        trim: true,
    },
    contact_phone: {
        type: String,
        trim: true,
    },
    jurisdiction_area: {
        type: String,
        trim: true,
    },
});

export const Department = mongoose.model("department", departmentSchema);