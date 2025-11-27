/**
 * Escalation Configuration for Frontend
 * Matches backend escalation times and provides UI configurations
 */

export const escalationTimes = {
  low: {
    1: { next: 2, delay: 24 * 3600 * 1000, hours: 24 },     // 1 → 2 (24 hours)
    2: { next: 3, delay: 24 * 3600 * 1000, hours: 24 },     // 2 → 3 (24 hours)
    3: { next: "close", delay: 24 * 3600 * 1000, hours: 24 } // 3 → close (24 hours)
  },
  medium: {
    1: { next: 2, delay: 12 * 3600 * 1000, hours: 12 },     // 1 → 2 (12 hours)
    2: { next: 3, delay: 24 * 3600 * 1000, hours: 24 },     // 2 → 3 (24 hours)
    3: { next: 4, delay: 36 * 3600 * 1000, hours: 36 },     // 3 → 4 (36 hours)
    4: { next: "close", delay: 48 * 3600 * 1000, hours: 48 } // 4 → close (48 hours)
  },
  high: {
    1: { next: 2, delay: 2 * 3600 * 1000, hours: 2 },       // 1 → 2 (2 hours)
    2: { next: 3, delay: 12 * 3600 * 1000, hours: 12 },     // 2 → 3 (12 hours)
    3: { next: 4, delay: 20 * 3600 * 1000, hours: 20 },     // 3 → 4 (20 hours)
    4: { next: 5, delay: 24 * 3600 * 1000, hours: 24 },     // 4 → 5 (24 hours)
    5: { next: "close", delay: 30 * 3600 * 1000, hours: 30 } // 5 → close (30 hours)
  }
};

/**
 * UI Configuration for Escalation Levels
 */
export const escalationLevelConfig = {
  1: {
    label: 'Registered',
    description: 'Complaint registered, awaiting officer assignment',
    color: '#3b82f6', // Blue
    icon: '📝',
    badge: 'Level 1'
  },
  2: {
    label: 'Escalated',
    description: 'Escalated to senior authority',
    color: '#f59e0b', // Amber
    icon: '⚠️',
    badge: 'Level 2'
  },
  3: {
    label: 'High Priority',
    description: 'High priority escalation',
    color: '#ef4444', // Red
    icon: '🚨',
    badge: 'Level 3'
  },
  4: {
    label: 'Critical',
    description: 'Critical escalation level',
    color: '#dc2626', // Dark Red
    icon: '🔥',
    badge: 'Level 4'
  },
  5: {
    label: 'Maximum',
    description: 'Maximum escalation level',
    color: '#991b1b', // Darker Red
    icon: '⛔',
    badge: 'Level 5'
  }
};

/**
 * Get escalation info for a specific level
 */
export const getEscalationInfo = (level) => {
  return escalationLevelConfig[level] || escalationLevelConfig[1];
};

/**
 * Get time remaining until next escalation
 */
export const getTimeUntilEscalation = (complaint) => {
  if (!complaint || complaint.status === 'resolved' || complaint.status === 'rejected') {
    return null;
  }

  const severity = complaint.severity || 'medium';
  const level = complaint.level || 1;
  
  // Use currentLevelStartedAt from escalation_id if available, otherwise fall back to createdAt
  const levelStartTime = complaint.escalation_id?.currentLevelStartedAt 
    ? new Date(complaint.escalation_id.currentLevelStartedAt)
    : new Date(complaint.createdAt || complaint.timestamp);
  
  const now = new Date();

  const escalationRule = escalationTimes[severity]?.[level];
  
  if (!escalationRule) {
    return null;
  }

  // Calculate time elapsed since current level started
  const timeElapsed = now - levelStartTime;
  const timeRemaining = escalationRule.delay - timeElapsed;

  if (timeRemaining <= 0) {
    return {
      isOverdue: true,
      message: 'Escalation overdue',
      hours: 0,
      minutes: 0
    };
  }

  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isOverdue: false,
    message: `${hoursRemaining}h ${minutesRemaining}m until next escalation`,
    hours: hoursRemaining,
    minutes: minutesRemaining,
    nextLevel: escalationRule.next,
    totalHours: escalationRule.hours
  };
};

/**
 * Format escalation time for display
 */
export const formatEscalationTime = (hours) => {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  return `${days}d ${remainingHours}h`;
};

/**
 * Get progress percentage for escalation timer
 */
export const getEscalationProgress = (complaint) => {
  if (!complaint || complaint.status === 'resolved' || complaint.status === 'rejected') {
    return 0;
  }

  const severity = complaint.severity || 'medium';
  const level = complaint.level || 1;
  
  // Use currentLevelStartedAt from escalation_id if available, otherwise fall back to createdAt
  const levelStartTime = complaint.escalation_id?.currentLevelStartedAt 
    ? new Date(complaint.escalation_id.currentLevelStartedAt)
    : new Date(complaint.createdAt || complaint.timestamp);
  
  const now = new Date();

  const escalationRule = escalationTimes[severity]?.[level];
  
  if (!escalationRule) {
    return 0;
  }

  const timeElapsed = now - levelStartTime;
  const progress = (timeElapsed / escalationRule.delay) * 100;

  return Math.min(Math.max(progress, 0), 100);
};
