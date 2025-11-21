import { complaintQueue } from "../queues/complaintQueue.js";
import { escalationTimes } from "./escalationTimes.js";
import { Complaint } from "../src/models/complaint.models.js";
import { Escalation } from "../src/models/escalation.models.js";

export const scheduleEscalation = async (complaint) => {
    const severity = complaint.severity;
    const level = complaint.level;

    const rules = escalationTimes[severity][level];

    if (!rules) return;

    // Find or create escalation record for this complaint
    let escalation = await Escalation.findOne({ complaint: complaint._id });
    
    if (!escalation) {
        escalation = await Escalation.create({
            complaint: complaint._id,
            history: []
        });
        
        // Link escalation to complaint
        complaint.escalation_id = escalation._id;
        await complaint.save();
    }

    // Remove existing job if any
    if (escalation.escalationJobId) {
        try {
            await complaintQueue.remove(escalation.escalationJobId);
            console.log(`Removed previous escalation job: ${escalation.escalationJobId}`);
        } catch (error) {
            console.error("Error removing previous job:", error);
        }
    }

    // Update the current level start time (this resets the timer)
    escalation.currentLevelStartedAt = new Date();

    // Schedule new escalation job
    const job = await complaintQueue.add(
        "auto-escalate",
        {
            complaintId: complaint._id.toString(),
            escalationId: escalation._id.toString(),
            severity,
            level,
        },
        {
            delay: rules.delay
        }
    );

    // Store job ID in escalation record
    escalation.escalationJobId = job.id;
    await escalation.save();
    
    console.log(`Scheduled escalation job ${job.id} for complaint ${complaint._id} (level ${level} -> ${rules.next}) starting from ${escalation.currentLevelStartedAt}`);
}