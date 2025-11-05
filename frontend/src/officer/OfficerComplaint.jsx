import React, { useState } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerComplaint.css';

const OfficerComplaint = () => {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Placeholder data - replace with actual API call
    const complaints = [
        { id: 1, title: 'Road Damage', location: 'Downtown', status: 'pending', priority: 'high', date: '2024-11-05' },
        { id: 2, title: 'Water Supply Issue', location: 'North Area', status: 'in-progress', priority: 'medium', date: '2024-11-04' },
        { id: 3, title: 'Street Light', location: 'East Side', status: 'resolved', priority: 'low', date: '2024-11-03' },
    ];

    const filteredComplaints = complaints.filter(complaint => {
        const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
        const matchesSearch = complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            complaint.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <>
            <Navbar />
            <div className="officer-complaint-container">
                <div className="officer-complaint-header">
                    <h1 className="officer-complaint-title">All Complaints</h1>
                    <p className="officer-complaint-subtitle">View and manage all citizen complaints</p>
                </div>

                <div className="officer-complaint-controls">
                    <div className="officer-complaint-search-box">
                        <svg className="officer-complaint-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search complaints..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="officer-complaint-search-input"
                        />
                    </div>

                    <div className="officer-complaint-filter-buttons">
                        <button
                            className={`officer-complaint-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('all')}
                        >
                            All
                        </button>
                        <button
                            className={`officer-complaint-filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('pending')}
                        >
                            Pending
                        </button>
                        <button
                            className={`officer-complaint-filter-btn ${filterStatus === 'in-progress' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('in-progress')}
                        >
                            In Progress
                        </button>
                        <button
                            className={`officer-complaint-filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('resolved')}
                        >
                            Resolved
                        </button>
                    </div>
                </div>

                <div className="officer-complaints-grid">
                    {filteredComplaints.map((complaint) => (
                        <div key={complaint.id} className="officer-complaint-card">
                            <div className="officer-complaint-card-header">
                                <h3 className="officer-complaint-card-title">{complaint.title}</h3>
                                <span className={`officer-complaint-priority-badge officer-complaint-priority-${complaint.priority}`}>
                                    {complaint.priority}
                                </span>
                            </div>
                            <div className="officer-complaint-details">
                                <div className="officer-complaint-detail-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{complaint.location}</span>
                                </div>
                                <div className="officer-complaint-detail-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{complaint.date}</span>
                                </div>
                            </div>
                            <div className="officer-complaint-status">
                                <span className={`officer-complaint-status-badge officer-complaint-status-${complaint.status}`}>
                                    {complaint.status.replace('-', ' ')}
                                </span>
                            </div>
                            <button className="officer-complaint-view-details-btn">
                                View Details
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default OfficerComplaint;
