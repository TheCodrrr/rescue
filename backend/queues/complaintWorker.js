import { Worker } from "bullmq";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Complaint } from "../src/models/complaint.models.js";
import { escalationTimes } from "../utils/escalationTimes.js";
import { scheduleEscalation } from "../utils/scheduleEscalation.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected for complaint worker");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

await connectDB();

const worker = new Worker(
    "complaint-queue",
    async (job) => {
        console.log("Running scheduled escalation for complaint:", job.data);
        
        const { complaintId, escalationId, severity, level } = job.data;

        try {
            // Fetch the complaint and escalation record
            const complaint = await Complaint.findById(complaintId);
            
            if (!complaint) {
                console.error(`Complaint ${complaintId} not found`);
                return;
            }

            // Check if complaint is resolved or rejected - don't escalate
            if (complaint.status === "resolved" || complaint.status === "rejected") {
                console.log(`Complaint ${complaintId} is ${complaint.status}, skipping escalation`);
                
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
                console.log(`Closing complaint ${complaintId} - reached final escalation level`);
                
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
            console.log(`Escalating complaint ${complaintId} from level ${level} to level ${nextLevel}`);
            
            // Add escalation event to history
            escalation.history.push({
                from_level: level,
                to_level: nextLevel,
                reason: "Auto-escalation: No action taken within time limit",
                escalated_at: new Date()
            });
            await escalation.save();
            
            // Update complaint level
            complaint.level = nextLevel;
            await complaint.save();

            // Schedule next escalation
            await scheduleEscalation(complaint);
            
            console.log(`Successfully escalated complaint ${complaintId} to level ${nextLevel}`);
        } catch (error) {
            console.error(`Error processing escalation for complaint ${complaintId}:`, error);
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
    console.log(`Job completed: ${job.id}`);
})

worker.on("failed", (job, err) => {
    console.error(`Job failed: ${job.id}`, err);
})