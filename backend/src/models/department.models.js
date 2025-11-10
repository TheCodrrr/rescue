import mongoose, { Schema } from "mongoose"
import bcrypt from "bcryptjs";

const departmentSchema = new Schema({
    category: {
        type: String,
        enum: ['rail', 'fire', 'cyber', 'police', 'court', 'road'],
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
    jurisdiction_level: {
        type: Number,
        default: 1,
        min: 1,
    },
    department_secret: {
        type: String,
        required: true,
        minLength: 6,
        select: false,
    }
});

departmentSchema.pre("save", async function(next) {
    if (!this.isModified("department_secret")) return next();

    const salt = await bcrypt.genSalt(10);
    this.department_secret = await bcrypt.hash(this.department_secret, salt);
    next();
})

departmentSchema.methods.verifySecret = async function(enteredSecret) {
    return await bcrypt.compare(enteredSecret, this.department_secret);
}

export const Department = mongoose.model("department", departmentSchema);