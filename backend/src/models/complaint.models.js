import mongoose from 'mongoose';
import { Feedback } from './feedback.models.js';

const complaintSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    title: {
        type: String,
        required: true,
    },
    description: String,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'rejected'],
        default: 'pending'
    },
    category: {
        type: String,
        enum: ['rail', 'fire', 'cyber', 'police', 'court'],
        required: true,
    },
    category_data_url: {
        type: String,
        required: true,
    },
    latitude: Number,
    longitude: Number,
    address: String,
    level: {
        type: Number,
        min: 1,
        default: 1,
    },
    ai_classification: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category'
    },
    ai_score: Number,
    evidence_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'evidence'
    }],
    upvote: {
        type: Number,
        default: 0
    },
    downvote: {
        type: Number,
        default: 0
    },
    votedUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },
        vote: {
            type: String,
            enum: ["upvote", "downvote"],
        }
    }],
    priority: {
        type: Number,
        min: 1,
        max: 10,
        default: 1,
    },
    escalation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "escalation",
    },
    officer_notes: String,
    assigned_officer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    feedback_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'feedback',
        default: null
    }],
    assignedDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "department",
        default: null,
    }
}, { timestamps: true });

complaintSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    try {
        await Feedback.deleteMany({ complaint_id: this._id });
        console.log("Deleted related feedbacks");
        next();
    } catch (err) {
        next(err);
    }
});

export const Complaint = mongoose.model('complaint', complaintSchema);
