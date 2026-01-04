import { Worker } from "bullmq";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Complaint } from "../src/models/complaint.models.js";
import { escalationTimes } from "../utils/escalationTimes.js";
import { scheduleEscalation } from "../utils/scheduleEscalation.js";
import { io } from "../src/server.js";
import { getTrainByNumber } from "../src/services/rail.service.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/lodge`);
        // console.log("MongoDB connected for complaint worker to database: lodge");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

await connectDB();

const worker = new Worker(
    "complaint-queue",
    async (job) => {
        
        const { complaintId, escalationId, severity, level } = job.data;

        try {
            // Fetch the complaint and escalation record
            const complaint = await Complaint.findById(complaintId);
            
            if (!complaint) {
                console.error(`Complaint ${complaintId} not found in database`);
                return;
            }

            // Check if complaint is resolved or rejected - don't escalate
            if (complaint.status === "resolved" || complaint.status === "rejected") {
                // Clear the job ID from escalation
                const escalation = await mongoose.model("escalation").findById(escalationId);
                if (escalation) {
                    escalation.escalationJobId = null;
                    await escalation.save();
                }
                return;
            }

            // Get escalation rules for current level
            const rules = escalationTimes[severity][level];
            
            if (!rules) {
                console.error(`No escalation rules found for severity: ${severity}, level: ${level}`);
                return;
            }

            // Get escalation record
            const escalation = await mongoose.model("escalation").findById(escalationId);
            if (!escalation) {
                console.error(`Escalation record ${escalationId} not found`);
                return;
            }

            // Check if we should close the complaint
            if (rules.next === "close") {
                // Add final escalation event to history
                escalation.history.push({
                    from_level: level,
                    to_level: level,
                    reason: "Auto-closed: Maximum escalation level reached",
                    escalated_at: new Date()
                });
                escalation.escalationJobId = null;
                await escalation.save();
                
                complaint.status = "rejected";
                await complaint.save();
                return;
            }

            // Escalate to next level
            const nextLevel = rules.next;
            
            // Add escalation event to history
            escalation.history.push({
                from_level: level,
                to_level: nextLevel,
                reason: "Auto-escalation: No action taken within time limit",
                escalated_at: new Date()
            });
            await escalation.save();
            
            // Update complaint level and reactivate for other officers
            complaint.level = nextLevel;
            complaint.active = true; // Make complaint available for other officers to accept
            complaint.assigned_officer_id = null; // Clear previous officer assignment
            complaint.status = "pending"; // Reset status back to pending
            await complaint.save();

            // Schedule next escalation
            await scheduleEscalation(complaint);

            // Emit socket event for escalated complaint (timer expired)
            try {
                // Populate complaint with full details
                const populatedComplaint = await Complaint.findById(complaintId)
                    .populate("user_id", "name email profileImage")
                    .populate("evidence_ids")
                    .lean();

                // Add train data if it's a rail complaint
                let enrichedComplaint = populatedComplaint;
                if (populatedComplaint.category === "rail" && populatedComplaint.category_data_id) {
                    try {
                        const train = await getTrainByNumber(populatedComplaint.category_data_id);
                        if (train && train.stations) {
                            const stations = typeof train.stations === 'string' 
                                ? JSON.parse(train.stations) 
                                : train.stations;
                            enrichedComplaint = { ...populatedComplaint, category_specific_data: { ...train, stations } };
                        } else {
                            enrichedComplaint = { ...populatedComplaint, category_specific_data: train };
                        }
                    } catch (error) {
                        console.error("Error fetching train data for socket emit:", error);
                    }
                }

                // Emit general complaint event (same as registration)
                io.emit("newComplaint", enrichedComplaint);
                
                // Emit specific event for officers with escalation info
                const officerEventData = {
                    complaint: enrichedComplaint,
                    location: enrichedComplaint.location,
                    severity: enrichedComplaint.severity,
                    category: enrichedComplaint.category,
                    level: enrichedComplaint.level,
                    escalated: true,
                    previousLevel: level,
                    timestamp: new Date()
                };
                
                io.emit("newComplaintForOfficer", officerEventData);
            } catch (socketError) {
                console.error("Error emitting socket events for escalated complaint:", socketError);
                // Don't fail the escalation if socket emit fails
            }
        } catch (error) {
            console.error("Error processing escalation:", error);
            throw error;
        }
    },
    {
        connection: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
        }
    }
)

worker.on("completed", (job) => {
    // console.log("\n");
    // console.log("✅".repeat(40));
    // console.log(`✅ BullMQ Job COMPLETED: ${job.id}`);
    // console.log(`✅ Complaint: ${job.data.complaintId}`);
    // console.log(`✅ Completed at: ${new Date().toISOString()}`);
    // console.log("✅".repeat(40));
    // console.log("\n");
})

worker.on("failed", (job, err) => {
    // console.log("\n");
    console.error("❌".repeat(40));
    console.error(`❌ BullMQ Job FAILED: ${job?.id}`);
    console.error(`❌ Complaint: ${job?.data?.complaintId}`);
    console.error(`❌ Error:`, err);
    console.error("❌".repeat(40));
    console.error("\n");
})