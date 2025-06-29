import mongoose from 'mongoose';

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
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category'
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
    voted_users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        vote: { type: String, enum: ["upvote", "downvote"] }
    }],
    priority: {
        type: Number,
        min: 0,
        max: 10,
        default: 5
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
    feedback_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'feedback',
        default: null
    },
    assignedDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "department",
        default: null,
    }
}, { timestamps: true });

export const Complaint = mongoose.model('complaint', complaintSchema);
