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
            // console.log(`Removed previous escalation job: ${escalation.escalationJobId}`);
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
    
    // console.log(`Scheduled escalation job ${job.id} for complaint ${complaint._id} (level ${level} -> ${rules.next})`);
}

/**
 * Cancel/remove escalation job for a complaint
 * This should be called when complaint is resolved, rejected, or no longer needs escalation
 */
export const cancelEscalation = async (complaintId) => {
    try {
        const escalation = await Escalation.findOne({ complaint: complaintId });
        
        if (!escalation) {
            // console.log(`No escalation record found for complaint ${complaintId}`);
            return { success: false, message: 'No escalation found' };
        }

        if (escalation.escalationJobId) {
            try {
                await complaintQueue.remove(escalation.escalationJobId);
                // console.log(`✅ Cancelled escalation job ${escalation.escalationJobId} for complaint ${complaintId}`);
                
                // Clear the job ID from escalation record
                escalation.escalationJobId = null;
                await escalation.save();
                
                return { success: true, message: 'Escalation cancelled successfully' };
            } catch (error) {
                console.error(`Error removing escalation job ${escalation.escalationJobId}:`, error);
                return { success: false, message: error.message };
            }
        } else {
            // console.log(`No active escalation job for complaint ${complaintId}`);
            return { success: false, message: 'No active escalation job' };
        }
    } catch (error) {
        console.error(`Error cancelling escalation for complaint ${complaintId}:`, error);
        return { success: false, message: error.message };
    }
}