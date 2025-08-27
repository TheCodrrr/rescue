export const calculateTrendingScore = (complaint) => {
    const upvotes = complaint.upvote || 0;
    const downvotes = complaint.downvote || 0;
    const createdAt = complaint.createdAt || new Date();

    const hrsSinceCreated = (Date.now() - new Date(createdAt).getTime() / (1000 * 60 * 60));

    const score = (upvotes - downvotes) / Math.pow(hrsSinceCreated + 2, 1.5);
    
    return score;
}