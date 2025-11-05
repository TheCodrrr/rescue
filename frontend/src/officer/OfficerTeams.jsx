import React, { useState } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerTeams.css';

const OfficerTeams = () => {
    const [selectedTeam, setSelectedTeam] = useState(null);

    // Placeholder data - replace with actual API call
    const teams = [
        {
            id: 1,
            name: 'Emergency Response Team',
            department: 'Public Safety',
            members: 12,
            activeCases: 8,
            lead: 'Sarah Johnson',
            status: 'active',
            description: 'Handles critical emergency situations requiring immediate response'
        },
        {
            id: 2,
            name: 'Infrastructure Repair Team',
            department: 'Public Works',
            members: 15,
            activeCases: 23,
            lead: 'Michael Chen',
            status: 'active',
            description: 'Responsible for road repairs, infrastructure maintenance and upgrades'
        },
        {
            id: 3,
            name: 'Water Management Team',
            department: 'Water Department',
            members: 8,
            activeCases: 12,
            lead: 'Emily Rodriguez',
            status: 'active',
            description: 'Manages water supply, leakage issues, and water quality monitoring'
        },
        {
            id: 4,
            name: 'Sanitation Services',
            department: 'Sanitation',
            members: 20,
            activeCases: 45,
            lead: 'David Park',
            status: 'active',
            description: 'Handles garbage collection, waste management, and cleanliness initiatives'
        },
    ];

    const teamMembers = [
        { id: 1, name: 'John Doe', role: 'Field Officer', casesHandled: 15, availability: 'available' },
        { id: 2, name: 'Jane Smith', role: 'Senior Officer', casesHandled: 23, availability: 'busy' },
        { id: 3, name: 'Robert Brown', role: 'Field Officer', casesHandled: 18, availability: 'available' },
        { id: 4, name: 'Lisa Anderson', role: 'Supervisor', casesHandled: 31, availability: 'available' },
    ];

    return (
        <>
            <Navbar />
            <div className="teams-container">
                <div className="teams-header">
                    <h1 className="teams-title">Teams</h1>
                    <p className="teams-subtitle">Manage departments and team members</p>
                </div>

                <div className="teams-stats">
                    <div className="team-stat-card">
                        <div className="team-stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Total Teams</h3>
                            <p className="team-stat-number">{teams.length}</p>
                        </div>
                    </div>

                    <div className="team-stat-card">
                        <div className="team-stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Total Members</h3>
                            <p className="team-stat-number">{teams.reduce((sum, team) => sum + team.members, 0)}</p>
                        </div>
                    </div>

                    <div className="team-stat-card">
                        <div className="team-stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Active Cases</h3>
                            <p className="team-stat-number">{teams.reduce((sum, team) => sum + team.activeCases, 0)}</p>
                        </div>
                    </div>

                    <div className="team-stat-card">
                        <div className="team-stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Active Teams</h3>
                            <p className="team-stat-number">{teams.filter(t => t.status === 'active').length}</p>
                        </div>
                    </div>
                </div>

                <div className="teams-grid">
                    {teams.map((team) => (
                        <div 
                            key={team.id} 
                            className="officer-team-card"
                            onClick={() => setSelectedTeam(team.id === selectedTeam ? null : team.id)}
                        >
                            <div className="team-card-header">
                                <h3 className="team-name">{team.name}</h3>
                                <span className={`team-status-badge officer-team-status-${team.status}`}>
                                    {team.status}
                                </span>
                            </div>

                            <p className="team-description">{team.description}</p>

                            <div className="team-info-grid">
                                <div className="team-info-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <div>
                                        <span className="info-label">Department</span>
                                        <span className="info-value">{team.department}</span>
                                    </div>
                                </div>

                                <div className="team-info-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <div>
                                        <span className="info-label">Team Lead</span>
                                        <span className="info-value">{team.lead}</span>
                                    </div>
                                </div>

                                <div className="team-info-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <div>
                                        <span className="info-label">Members</span>
                                        <span className="info-value">{team.members}</span>
                                    </div>
                                </div>

                                <div className="team-info-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div>
                                        <span className="info-label">Active Cases</span>
                                        <span className="info-value">{team.activeCases}</span>
                                    </div>
                                </div>
                            </div>

                            <button className="view-team-btn">
                                View Team Details
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="team-members-section">
                    <h2 className="section-title">Team Members Directory</h2>
                    <div className="members-table-container">
                        <table className="members-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Cases Handled</th>
                                    <th>Availability</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamMembers.map((member) => (
                                    <tr key={member.id}>
                                        <td className="member-name-cell">
                                            <div className="member-avatar">
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            {member.name}
                                        </td>
                                        <td>{member.role}</td>
                                        <td>{member.casesHandled}</td>
                                        <td>
                                            <span className={`availability-badge ${member.availability}`}>
                                                {member.availability}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="member-action-btn">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default OfficerTeams;
