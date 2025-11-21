import React, { useState, useEffect } from 'react';
import { 
  getEscalationInfo, 
  getTimeUntilEscalation, 
  getEscalationProgress,
  formatEscalationTime 
} from './utils/escalationConfig.js';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import './EscalationBadge.css';

/**
 * EscalationBadge Component
 * Displays the current escalation level and countdown timer
 */
const EscalationBadge = ({ complaint, showTimer = true, showProgress = false, size = 'medium' }) => {
  const [timeInfo, setTimeInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!complaint || complaint.status === 'resolved' || complaint.status === 'rejected') {
      setTimeInfo(null);
      return;
    }

    // Update time info every minute
    const updateTimeInfo = () => {
      const info = getTimeUntilEscalation(complaint);
      setTimeInfo(info);
      
      if (showProgress) {
        const prog = getEscalationProgress(complaint);
        setProgress(prog);
      }
    };

    updateTimeInfo();
    const interval = setInterval(updateTimeInfo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [complaint, showProgress]);

  if (!complaint) {
    return null;
  }

  const level = complaint.level || 0;
  const escalationInfo = getEscalationInfo(level);
  const isResolved = complaint.status === 'resolved' || complaint.status === 'rejected';

  // Different size classes
  const sizeClass = `escalation-badge-${size}`;

  return (
    <div className={`escalation-badge-container ${sizeClass}`}>
      {/* Level Badge */}
      <div 
        className="escalation-level-badge"
        style={{ 
          backgroundColor: escalationInfo.color,
          borderColor: escalationInfo.color 
        }}
      >
        <span className="escalation-icon">{escalationInfo.icon}</span>
        <div className="escalation-level-info">
          <span className="escalation-level-label">{escalationInfo.badge}</span>
          <span className="escalation-level-description">{escalationInfo.label}</span>
        </div>
      </div>

      {/* Timer (only show if not resolved and showTimer is true) */}
      {!isResolved && showTimer && timeInfo && (
        <div className={`escalation-timer ${timeInfo.isOverdue ? 'overdue' : ''}`}>
          {timeInfo.isOverdue ? (
            <>
              <AlertCircle size={16} />
              <span className="timer-text">{timeInfo.message}</span>
            </>
          ) : (
            <>
              <Clock size={16} />
              <span className="timer-text">
                {timeInfo.hours}h {timeInfo.minutes}m
              </span>
              <span className="timer-label">until Level {timeInfo.nextLevel}</span>
            </>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {!isResolved && showProgress && (
        <div className="escalation-progress-container">
          <div 
            className="escalation-progress-bar"
            style={{ 
              width: `${progress}%`,
              backgroundColor: progress > 80 ? '#ef4444' : progress > 50 ? '#f59e0b' : escalationInfo.color
            }}
          />
          <span className="escalation-progress-text">{Math.round(progress)}%</span>
        </div>
      )}

      {/* Status indicator for resolved complaints */}
      {isResolved && (
        <div className={`escalation-status-badge ${complaint.status}`}>
          {complaint.status === 'resolved' ? '✓ Resolved' : '✗ Rejected'}
        </div>
      )}
    </div>
  );
};

/**
 * Compact Escalation Badge (for lists/cards)
 */
export const CompactEscalationBadge = ({ complaint }) => {
  if (!complaint) return null;

  const level = complaint.level || 0;
  const escalationInfo = getEscalationInfo(level);
  const isResolved = complaint.status === 'resolved' || complaint.status === 'rejected';

  return (
    <div 
      className="escalation-badge-compact"
      style={{ 
        backgroundColor: escalationInfo.color,
        borderColor: escalationInfo.color 
      }}
      title={`${escalationInfo.label} - ${escalationInfo.description}`}
    >
      <span className="compact-icon">{escalationInfo.icon}</span>
      <span className="compact-label">L{level}</span>
      {isResolved && (
        <span className="compact-status">
          {complaint.status === 'resolved' ? '✓' : '✗'}
        </span>
      )}
    </div>
  );
};

/**
 * Escalation Timeline Component (shows escalation history)
 */
export const EscalationTimeline = ({ escalationHistory }) => {
  if (!escalationHistory || escalationHistory.length === 0) {
    return (
      <div className="escalation-timeline-empty">
        <TrendingUp size={24} />
        <p>No escalation events yet</p>
      </div>
    );
  }

  return (
    <div className="escalation-timeline">
      <h3 className="timeline-title">
        <TrendingUp size={20} />
        Escalation History
      </h3>
      <div className="timeline-events">
        {escalationHistory.map((event, index) => {
          const fromInfo = getEscalationInfo(event.from_level);
          const toInfo = getEscalationInfo(event.to_level);
          const eventDate = new Date(event.escalated_at);

          return (
            <div key={index} className="timeline-event">
              <div className="event-marker" style={{ backgroundColor: toInfo.color }}>
                <span>{toInfo.icon}</span>
              </div>
              
              <div className="event-content">
                <div className="event-header">
                  <span className="event-levels">
                    Level {event.from_level} → Level {event.to_level}
                  </span>
                  <span className="event-date">
                    {eventDate.toLocaleDateString()} {eventDate.toLocaleTimeString()}
                  </span>
                </div>
                
                {event.reason && (
                  <p className="event-reason">{event.reason}</p>
                )}
                
                {event.escalated_by && (
                  <span className="event-by">
                    by {event.escalated_by.name || 'System'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EscalationBadge;
