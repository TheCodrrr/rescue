import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerDepartment.css';

const OfficerDepartment = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Department data with statistics
    const departments = [
        {
            id: 1,
            name: 'Public Works',
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
            color: 'var(--color3)',
            activeComplaints: 45,
            resolvedToday: 12,
            avgResponseTime: '2.5 hrs',
            officers: [
                { name: 'John Smith', complaints: 8, status: 'active' },
                { name: 'Sarah Johnson', complaints: 6, status: 'active' },
                { name: 'Mike Davis', complaints: 5, status: 'active' },
            ],
            recentActivity: [
                { action: 'Complaint resolved', officer: 'John Smith', time: '10 mins ago' },
                { action: 'New assignment', officer: 'Sarah Johnson', time: '25 mins ago' },
                { action: 'Status updated', officer: 'Mike Davis', time: '1 hour ago' },
            ]
        },
        {
            id: 2,
            name: 'Water Department',
            icon: 'M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            color: 'var(--color8)',
            activeComplaints: 32,
            resolvedToday: 8,
            avgResponseTime: '1.8 hrs',
            officers: [
                { name: 'Emily Brown', complaints: 7, status: 'active' },
                { name: 'David Wilson', complaints: 5, status: 'active' },
                { name: 'Lisa Anderson', complaints: 4, status: 'busy' },
            ],
            recentActivity: [
                { action: 'Emergency resolved', officer: 'Emily Brown', time: '5 mins ago' },
                { action: 'Complaint accepted', officer: 'David Wilson', time: '15 mins ago' },
                { action: 'Field inspection', officer: 'Lisa Anderson', time: '30 mins ago' },
            ]
        },
        {
            id: 3,
            name: 'Electricity',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            color: '#FFD93D',
            activeComplaints: 28,
            resolvedToday: 15,
            avgResponseTime: '1.2 hrs',
            officers: [
                { name: 'Robert Taylor', complaints: 6, status: 'active' },
                { name: 'Jennifer Lee', complaints: 5, status: 'active' },
                { name: 'Chris Martin', complaints: 3, status: 'active' },
            ],
            recentActivity: [
                { action: 'Power restored', officer: 'Robert Taylor', time: '8 mins ago' },
                { action: 'Site inspection', officer: 'Jennifer Lee', time: '20 mins ago' },
                { action: 'Complaint resolved', officer: 'Chris Martin', time: '45 mins ago' },
            ]
        },
        {
            id: 4,
            name: 'Sanitation',
            icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
            color: '#51CF66',
            activeComplaints: 38,
            resolvedToday: 10,
            avgResponseTime: '3.1 hrs',
            officers: [
                { name: 'Mark Thompson', complaints: 9, status: 'active' },
                { name: 'Amanda Clark', complaints: 7, status: 'active' },
                { name: 'Kevin White', complaints: 6, status: 'busy' },
            ],
            recentActivity: [
                { action: 'Collection completed', officer: 'Mark Thompson', time: '12 mins ago' },
                { action: 'Route assigned', officer: 'Amanda Clark', time: '35 mins ago' },
                { action: 'Complaint accepted', officer: 'Kevin White', time: '1 hour ago' },
            ]
        },
        {
            id: 5,
            name: 'Traffic & Transport',
            icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            color: '#FF6B6B',
            activeComplaints: 41,
            resolvedToday: 9,
            avgResponseTime: '2.8 hrs',
            officers: [
                { name: 'Thomas Garcia', complaints: 8, status: 'active' },
                { name: 'Patricia Miller', complaints: 6, status: 'active' },
                { name: 'Daniel Moore', complaints: 5, status: 'active' },
            ],
            recentActivity: [
                { action: 'Traffic cleared', officer: 'Thomas Garcia', time: '6 mins ago' },
                { action: 'Signal repaired', officer: 'Patricia Miller', time: '22 mins ago' },
                { action: 'Complaint resolved', officer: 'Daniel Moore', time: '40 mins ago' },
            ]
        },
        {
            id: 6,
            name: 'Health & Safety',
            icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
            color: '#A78BFA',
            activeComplaints: 19,
            resolvedToday: 7,
            avgResponseTime: '1.5 hrs',
            officers: [
                { name: 'Dr. Susan Wright', complaints: 4, status: 'active' },
                { name: 'Dr. James Harris', complaints: 3, status: 'active' },
                { name: 'Nurse Carol King', complaints: 2, status: 'active' },
            ],
            recentActivity: [
                { action: 'Inspection completed', officer: 'Dr. Susan Wright', time: '15 mins ago' },
                { action: 'Health check done', officer: 'Dr. James Harris', time: '28 mins ago' },
                { action: 'Report submitted', officer: 'Nurse Carol King', time: '50 mins ago' },
            ]
        }
    ];

    const filteredDepartments = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDepartmentClick = (dept) => {
        setSelectedDepartment(selectedDepartment?.id === dept.id ? null : dept);
    };

    const getTotalStatistics = () => {
        return {
            totalActive: departments.reduce((sum, dept) => sum + dept.activeComplaints, 0),
            totalResolved: departments.reduce((sum, dept) => sum + dept.resolvedToday, 0),
            totalOfficers: departments.reduce((sum, dept) => sum + dept.officers.length, 0),
            totalDepartments: departments.length
        };
    };

    const stats = getTotalStatistics();

    return (
        <>
            <Navbar />
            <div className="officer-department-container">
                <div className="officer-department-header">
                    <div className="officer-department-header-content">
                        <h1 className="officer-department-title">
                            <svg className="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Department Management
                        </h1>
                        <p className="officer-department-subtitle">
                            Monitor and manage all departments • {user?.name || 'Officer'}
                        </p>
                    </div>

                    <div className="officer-department-search">
                        <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search departments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="officer-department-search-input"
                        />
                    </div>
                </div>

                {/* Overall Statistics */}
                <div className="officer-department-overview-stats">
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon" style={{ background: 'linear-gradient(135deg, var(--color3), var(--color8))' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="overview-stat-details">
                            <h3>{stats.totalActive}</h3>
                            <p>Active Complaints</p>
                        </div>
                    </div>

                    <div className="overview-stat-card">
                        <div className="overview-stat-icon" style={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="overview-stat-details">
                            <h3>{stats.totalResolved}</h3>
                            <p>Resolved Today</p>
                        </div>
                    </div>

                    <div className="overview-stat-card">
                        <div className="overview-stat-icon" style={{ background: 'linear-gradient(135deg, #FFD93D, #F6B93B)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="overview-stat-details">
                            <h3>{stats.totalOfficers}</h3>
                            <p>Active Officers</p>
                        </div>
                    </div>

                    <div className="overview-stat-card">
                        <div className="overview-stat-icon" style={{ background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="overview-stat-details">
                            <h3>{stats.totalDepartments}</h3>
                            <p>Total Departments</p>
                        </div>
                    </div>
                </div>

                {/* Departments Grid */}
                <div className="officer-departments-grid">
                    {filteredDepartments.map((dept) => (
                        <div 
                            key={dept.id}
                            className={`officer-department-card ${selectedDepartment?.id === dept.id ? 'selected' : ''}`}
                            onClick={() => handleDepartmentClick(dept)}
                        >
                            <div className="department-card-header">
                                <div className="department-icon" style={{ background: dept.color }}>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dept.icon} />
                                    </svg>
                                </div>
                                <div className="department-header-info">
                                    <h3>{dept.name}</h3>
                                    <p>{dept.officers.length} Officers</p>
                                </div>
                            </div>

                            <div className="department-card-stats">
                                <div className="department-stat-item">
                                    <span className="stat-label">Active</span>
                                    <span className="stat-value active">{dept.activeComplaints}</span>
                                </div>
                                <div className="department-stat-item">
                                    <span className="stat-label">Resolved</span>
                                    <span className="stat-value resolved">{dept.resolvedToday}</span>
                                </div>
                                <div className="department-stat-item">
                                    <span className="stat-label">Avg Time</span>
                                    <span className="stat-value time">{dept.avgResponseTime}</span>
                                </div>
                            </div>

                            {selectedDepartment?.id === dept.id && (
                                <div className="department-expanded-content">
                                    <div className="department-section">
                                        <h4>
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Officers on Duty
                                        </h4>
                                        <div className="officers-list">
                                            {dept.officers.map((officer, idx) => (
                                                <div key={idx} className="officer-item">
                                                    <div className="officer-avatar">
                                                        {officer.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div className="officer-info">
                                                        <span className="officer-name">{officer.name}</span>
                                                        <span className="officer-complaints">{officer.complaints} active complaints</span>
                                                    </div>
                                                    <span className={`officer-status ${officer.status}`}>
                                                        {officer.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="department-section">
                                        <h4>
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Recent Activity
                                        </h4>
                                        <div className="activity-list">
                                            {dept.recentActivity.map((activity, idx) => (
                                                <div key={idx} className="activity-item">
                                                    <div className="activity-indicator"></div>
                                                    <div className="activity-details">
                                                        <span className="activity-action">{activity.action}</span>
                                                        <span className="activity-meta">
                                                            {activity.officer} • {activity.time}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="department-actions">
                                        <button className="dept-action-btn primary">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            View Analytics
                                        </button>
                                        <button className="dept-action-btn secondary">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Assign Complaint
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {filteredDepartments.length === 0 && (
                    <div className="officer-department-empty">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3>No Departments Found</h3>
                        <p>Try adjusting your search query</p>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default OfficerDepartment;
