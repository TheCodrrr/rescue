export const calculateTrendingScore = (complaint) => {
    const upvotes = complaint.upvote || 0;
    const downvotes = complaint.downvote || 0;
    const createdAt = complaint.createdAt || new Date();

    // FIXED: hours since created
    const hrsSinceCreated = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

    // base score
    let score = (upvotes - downvotes) / Math.pow(hrsSinceCreated + 2, 1.5);

    // ensure no negatives
    score = Math.max(score, 0);

    // normalize to 0–25
    // pick a reasonable maxScore (e.g. 100 votes = hottest)
    const maxScore = 1; // adjust based on your expected scale
    const normalized = Math.min((score / maxScore) * 25, 25);

    console.log("Trending score:", normalized);
    return normalized;
};
