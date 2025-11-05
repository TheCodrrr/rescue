import React, { useState } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerQueue.css';

const OfficerQueue = () => {
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    // Placeholder data - replace with actual API call
    const queueItems = [
        { id: 1, complaint: 'Road Repair Needed', department: 'Public Works', assignedTo: 'John Doe', priority: 'high', waitTime: '2 hours' },
        { id: 2, complaint: 'Water Leakage', department: 'Water Department', assignedTo: 'Jane Smith', priority: 'critical', waitTime: '30 mins' },
        { id: 3, complaint: 'Street Light Out', department: 'Electricity', assignedTo: 'Unassigned', priority: 'medium', waitTime: '4 hours' },
        { id: 4, complaint: 'Garbage Collection', department: 'Sanitation', assignedTo: 'Mike Johnson', priority: 'low', waitTime: '1 day' },
    ];

    const departments = ['all', 'Public Works', 'Water Department', 'Electricity', 'Sanitation'];

    const filteredQueue = selectedDepartment === 'all' 
        ? queueItems 
        : queueItems.filter(item => item.department === selectedDepartment);

    return (
        <>
            <Navbar />
            <div className="officer-queue-container">
                <div className="officer-queue-header">
                    <h1 className="officer-queue-title">Department Queue</h1>
                    <p className="officer-queue-subtitle">Manage and assign complaints to respective departments</p>
                </div>

                <div className="officer-queue-department-filter">
                    {departments.map((dept) => (
                        <button
                            key={dept}
                            className={`officer-queue-dept-btn ${selectedDepartment === dept ? 'active' : ''}`}
                            onClick={() => setSelectedDepartment(dept)}
                        >
                            {dept === 'all' ? 'All Departments' : dept}
                        </button>
                    ))}
                </div>

                <div className="officer-queue-stats">
                    <div className="officer-queue-stat-card">
                        <div className="officer-queue-stat-icon" style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a6f)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="officer-queue-stat-info">
                            <h3>Pending</h3>
                            <p className="officer-queue-stat-number">{queueItems.filter(q => q.assignedTo === 'Unassigned').length}</p>
                        </div>
                    </div>

                    <div className="officer-queue-stat-card">
                        <div className="officer-queue-stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="officer-queue-stat-info">
                            <h3>Critical</h3>
                            <p className="officer-queue-stat-number">{queueItems.filter(q => q.priority === 'critical').length}</p>
                        </div>
                    </div>

                    <div className="officer-queue-stat-card">
                        <div className="officer-queue-stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div className="officer-queue-stat-info">
                            <h3>Assigned</h3>
                            <p className="officer-queue-stat-number">{queueItems.filter(q => q.assignedTo !== 'Unassigned').length}</p>
                        </div>
                    </div>

                    <div className="officer-queue-stat-card">
                        <div className="officer-queue-stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="officer-queue-stat-info">
                            <h3>Departments</h3>
                            <p className="officer-queue-stat-number">{departments.length - 1}</p>
                        </div>
                    </div>
                </div>

                <div className="officer-queue-table-container">
                    <table className="officer-queue-table">
                        <thead>
                            <tr>
                                <th>Complaint</th>
                                <th>Department</th>
                                <th>Assigned To</th>
                                <th>Priority</th>
                                <th>Wait Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQueue.map((item) => (
                                <tr key={item.id}>
                                    <td className="officer-queue-complaint-cell">{item.complaint}</td>
                                    <td>
                                        <span className="officer-queue-department-badge">{item.department}</span>
                                    </td>
                                    <td>
                                        <span className={`officer-queue-assigned-badge ${item.assignedTo === 'Unassigned' ? 'unassigned' : ''}`}>
                                            {item.assignedTo}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`officer-queue-priority-badge officer-queue-priority-${item.priority}`}>
                                            {item.priority}
                                        </span>
                                    </td>
                                    <td className="officer-queue-wait-time">{item.waitTime}</td>
                                    <td>
                                        <div className="officer-queue-action-buttons">
                                            <button className="officer-queue-action-btn officer-queue-assign-btn" title="Assign">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                </svg>
                                            </button>
                                            <button className="officer-queue-action-btn officer-queue-view-btn" title="View Details">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default OfficerQueue;
