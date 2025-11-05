import React, { useState } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerEscalations.css';

const OfficerEscalations = () => {
    const [filterType, setFilterType] = useState('all');

    // Placeholder data - replace with actual API call
    const escalations = [
        { 
            id: 1, 
            complaint: 'Critical Water Supply Failure', 
            originalDepartment: 'Water Department',
            escalatedTo: 'Regional Director',
            reason: 'Unresolved for 7 days', 
            severity: 'critical', 
            escalatedDate: '2024-11-04',
            status: 'pending'
        },
        { 
            id: 2, 
            complaint: 'Major Road Safety Issue', 
            originalDepartment: 'Public Works',
            escalatedTo: 'City Manager',
            reason: 'Multiple complaints', 
            severity: 'high', 
            escalatedDate: '2024-11-03',
            status: 'in-review'
        },
        { 
            id: 3, 
            complaint: 'Power Outage Affecting Hospital', 
            originalDepartment: 'Electricity',
            escalatedTo: 'Emergency Response',
            reason: 'Critical infrastructure', 
            severity: 'critical', 
            escalatedDate: '2024-11-05',
            status: 'resolved'
        },
    ];

    const filteredEscalations = filterType === 'all' 
        ? escalations 
        : escalations.filter(esc => esc.status === filterType);

    return (
        <>
            <Navbar />
            <div className="escalations-container">
                <div className="escalations-header">
                    <h1 className="escalations-title">Escalations</h1>
                    <p className="escalations-subtitle">High-priority complaints requiring immediate attention</p>
                </div>

                <div className="escalations-filter">
                    <button
                        className={`esc-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        All
                    </button>
                    <button
                        className={`esc-filter-btn ${filterType === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilterType('pending')}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending
                    </button>
                    <button
                        className={`esc-filter-btn ${filterType === 'in-review' ? 'active' : ''}`}
                        onClick={() => setFilterType('in-review')}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        In Review
                    </button>
                    <button
                        className={`esc-filter-btn ${filterType === 'resolved' ? 'active' : ''}`}
                        onClick={() => setFilterType('resolved')}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Resolved
                    </button>
                </div>

                <div className="escalations-stats">
                    <div className="esc-stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                        <h3>Critical</h3>
                        <p className="esc-stat-number">{escalations.filter(e => e.severity === 'critical').length}</p>
                    </div>
                    <div className="esc-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <h3>Pending Review</h3>
                        <p className="esc-stat-number">{escalations.filter(e => e.status === 'pending').length}</p>
                    </div>
                    <div className="esc-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <h3>In Progress</h3>
                        <p className="esc-stat-number">{escalations.filter(e => e.status === 'in-review').length}</p>
                    </div>
                    <div className="esc-stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
                        <h3>Resolved</h3>
                        <p className="esc-stat-number">{escalations.filter(e => e.status === 'resolved').length}</p>
                    </div>
                </div>

                <div className="escalations-list">
                    {filteredEscalations.map((escalation) => (
                        <div key={escalation.id} className="officer-escalation-card">
                            <div className="escalation-card-header">
                                <div className="escalation-title-section">
                                    <h3 className="escalation-title">{escalation.complaint}</h3>
                                    <span className={`severity-badge officer-esc-severity-${escalation.severity}`}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        {escalation.severity}
                                    </span>
                                </div>
                                <span className={`esc-status-badge officer-esc-status-${escalation.status}`}>
                                    {escalation.status.replace('-', ' ')}
                                </span>
                            </div>

                            <div className="escalation-details">
                                <div className="detail-row">
                                    <div className="detail-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <div>
                                            <span className="detail-label">Original Department</span>
                                            <span className="detail-value">{escalation.originalDepartment}</span>
                                        </div>
                                    </div>

                                    <div className="detail-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                        <div>
                                            <span className="detail-label">Escalated To</span>
                                            <span className="detail-value">{escalation.escalatedTo}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-row">
                                    <div className="detail-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <span className="detail-label">Reason</span>
                                            <span className="detail-value">{escalation.reason}</span>
                                        </div>
                                    </div>

                                    <div className="detail-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <div>
                                            <span className="detail-label">Escalated Date</span>
                                            <span className="detail-value">{escalation.escalatedDate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="escalation-actions">
                                <button className="esc-action-btn view-btn">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Details
                                </button>
                                <button className="esc-action-btn update-btn">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Update Status
                                </button>
                                <button className="esc-action-btn officer-esc-priority-btn">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Escalate Further
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default OfficerEscalations;
