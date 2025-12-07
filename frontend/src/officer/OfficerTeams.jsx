import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerTeams.css';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';

const OfficerTeams = () => {
    const user = useSelector((state) => state.auth.user);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamDetails, setTeamDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [availableOfficers, setAvailableOfficers] = useState([]);
    const [availableComplaints, setAvailableComplaints] = useState([]);
    const [officersPage, setOfficersPage] = useState(1);
    const [hasMoreOfficers, setHasMoreOfficers] = useState(false);
    const [loadingOfficers, setLoadingOfficers] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        const isAnyModalOpen = showCreateModal || showMemberModal || showComplaintModal || teamDetails;
        
        if (isAnyModalOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            
            // Apply styles to prevent scrolling
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            
            return () => {
                // Get the scroll position from the body's top style
                const scrollY = parseInt(document.body.style.top || '0') * -1;
                
                // Restore styles
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                
                // Restore scroll position instantly without smooth scrolling
                window.scrollTo({
                    top: scrollY,
                    left: 0,
                    behavior: 'instant'
                });
            };
        }
    }, [showCreateModal, showMemberModal, showComplaintModal, teamDetails]);
    
    const [newTeam, setNewTeam] = useState({
        name: '',
        category: user?.officer_category || '',
        members: []
    });

    // Category mapping for display
    const categoryLabels = {
        rail: 'Railway',
        fire: 'Fire Services',
        cyber: 'Cyber Crime',
        police: 'Police',
        court: 'Court',
        road: 'Road & Transport'
    };

    // Fetch teams by officer's category
    useEffect(() => {
        if (user?.officer_category) {
            fetchTeamsByCategory();
        }
    }, [user]);

    const fetchTeamsByCategory = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/team/${user.officer_category}/category`);
            
            if (response.data.success) {
                setTeams(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch teams');
        } finally {
            setLoading(false);
        }
    };

    // Fetch detailed team information
    const fetchTeamDetails = async (teamId) => {
        try {
            const response = await axiosInstance.get(`/team/${teamId}`);
            
            if (response.data.success) {
                setTeamDetails(response.data.data);
                setSelectedTeam(teamId);
            }
        } catch (error) {
            console.error('Error fetching team details:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch team details');
        }
    };

    // Fetch available officers for adding to team with pagination
    const fetchAvailableOfficers = async (page = 1) => {
        try {
            setLoadingOfficers(true);
            
            // Get user's current location if available
            const latitude = user.latitude;
            const longitude = user.longitude;
            
            const params = {
                page,
                limit: 10
            };
            
            // Add location parameters if available
            if (latitude && longitude) {
                params.latitude = latitude;
                params.longitude = longitude;
            }
            
            const response = await axiosInstance.get(`/officer/${user.officer_category}`, {
                params
            });
            
            if (response.data.success) {
                if (page === 1) {
                    setAvailableOfficers(response.data.data);
                } else {
                    // Append for lazy loading
                    setAvailableOfficers(prev => [...prev, ...response.data.data]);
                }
                setHasMoreOfficers(response.data.hasNextPage);
                setOfficersPage(response.data.currentPage);
            }
        } catch (error) {
            console.error('Error fetching officers:', error);
            toast.error('Failed to fetch available officers');
        } finally {
            setLoadingOfficers(false);
        }
    };

    // Load more officers (for lazy loading)
    const loadMoreOfficers = () => {
        if (!loadingOfficers && hasMoreOfficers) {
            fetchAvailableOfficers(officersPage + 1);
        }
    };

    // Fetch available complaints for assignment
    const fetchAvailableComplaints = async () => {
        try {
            const response = await axiosInstance.get('/complaints', {
                params: {
                    category: user.officer_category,
                    status: 'pending'
                }
            });
            
            if (response.data.success) {
                setAvailableComplaints(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching complaints:', error);
        }
    };

    // Create new team
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        
        try {
            const response = await axiosInstance.post('/team', {
                ...newTeam,
                department_id: user.department_id
            });
            
            if (response.data.success) {
                const teamId = response.data.data._id;
                
                // Add selected members to the team
                if (selectedMembers.length > 0) {
                    const memberPromises = selectedMembers.map(memberId => 
                        axiosInstance.post(`/team/${teamId}/add-member`, { memberId })
                            .catch(err => console.error('Error adding member:', err))
                    );
                    
                    await Promise.all(memberPromises);
                    toast.success(`Team created with ${selectedMembers.length} member(s)!`);
                } else {
                    toast.success('Team created successfully!');
                }
                
                setShowCreateModal(false);
                setNewTeam({ name: '', category: user.officer_category, members: [] });
                setSelectedMembers([]);
                fetchTeamsByCategory();
            }
        } catch (error) {
            console.error('Error creating team:', error);
            toast.error(error.response?.data?.message || 'Failed to create team');
        }
    };

    // Add member to team
    const handleAddMember = async (memberId) => {
        try {
            const response = await axiosInstance.post(`/team/${selectedTeam}/add-member`, {
                memberId
            });
            
            if (response.data.success) {
                toast.success('Member added successfully!');
                fetchTeamDetails(selectedTeam);
                setShowMemberModal(false);
            }
        } catch (error) {
            console.error('Error adding member:', error);
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    // Remove member from team
    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        
        try {
            const response = await axiosInstance.post(`/team/${selectedTeam}/remove-member`, {
                memberId
            });
            
            if (response.data.success) {
                toast.success('Member removed successfully!');
                fetchTeamDetails(selectedTeam);
            }
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    // Assign complaint to team
    const handleAssignComplaint = async (complaintId) => {
        try {
            const response = await axiosInstance.post(`/team/${selectedTeam}/add-complaint`, {
                complaintId
            });
            
            if (response.data.success) {
                toast.success('Complaint assigned successfully!');
                fetchTeamDetails(selectedTeam);
                setShowComplaintModal(false);
            }
        } catch (error) {
            console.error('Error assigning complaint:', error);
            toast.error(error.response?.data?.message || 'Failed to assign complaint');
        }
    };

    // Remove complaint from team
    const handleRemoveComplaint = async (complaintId) => {
        if (!window.confirm('Are you sure you want to remove this complaint?')) return;
        
        try {
            const response = await axiosInstance.post(`/team/${selectedTeam}/remove-complaint`, {
                complaintId
            });
            
            if (response.data.success) {
                toast.success('Complaint removed successfully!');
                fetchTeamDetails(selectedTeam);
            }
        } catch (error) {
            console.error('Error removing complaint:', error);
            toast.error(error.response?.data?.message || 'Failed to remove complaint');
        }
    };

    // Delete team
    const handleDeleteTeam = async (teamId) => {
        if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
        
        try {
            const response = await axiosInstance.delete(`/team/${teamId}`);
            
            if (response.data.success) {
                toast.success('Team deleted successfully!');
                setSelectedTeam(null);
                setTeamDetails(null);
                fetchTeamsByCategory();
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error(error.response?.data?.message || 'Failed to delete team');
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="teams-container">
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '60vh',
                        color: 'white'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                border: '4px solid rgba(255, 255, 255, 0.3)',
                                borderTop: '4px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 1rem'
                            }}></div>
                            <p>Loading teams...</p>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="teams-container">
                <div className="teams-header">
                    <h1 className="teams-title">Team Management</h1>
                    <p className="teams-subtitle">
                        {categoryLabels[user?.officer_category]} Department - Level {user?.user_level}
                    </p>
                    {user?.user_level >= 3 && (
                        <button 
                            className="create-team-btn"
                            onClick={() => {
                                // Reset states
                                setSelectedMembers([]);
                                setOfficersPage(1);
                                setHasMoreOfficers(true);
                                setAvailableOfficers([]);
                                // Fetch first page of officers
                                fetchAvailableOfficers(1);
                                setShowCreateModal(true);
                            }}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create New Team
                        </button>
                    )}
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
                            <p className="team-stat-number">
                                {teams.reduce((sum, team) => sum + team.total_members, 0)}
                            </p>
                        </div>
                    </div>

                    <div className="team-stat-card">
                        <div className="team-stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Active Complaints</h3>
                            <p className="team-stat-number">
                                {teams.reduce((sum, team) => sum + team.total_assigned_complaints, 0)}
                            </p>
                        </div>
                    </div>

                    <div className="team-stat-card">
                        <div className="team-stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Avg Team Level</h3>
                            <p className="team-stat-number">
                                {teams.length > 0 
                                    ? (teams.reduce((sum, team) => sum + team.team_level, 0) / teams.length).toFixed(1)
                                    : '0'}
                            </p>
                        </div>
                    </div>
                </div>

                {teams.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'white' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No Teams Found</h3>
                        <p style={{ opacity: 0.8 }}>Create a new team to get started</p>
                    </div>
                ) : (
                    <div className="teams-grid">
                        {teams.map((team) => (
                            <div 
                                key={team._id} 
                                className="officer-team-card"
                            >
                                <div className="team-card-header">
                                    <h3 className="team-name">{team.name}</h3>
                                    <span className="team-level-badge">
                                        Level {team.team_level.toFixed(1)}
                                    </span>
                                </div>

                                <div className="team-info-grid">
                                    <div className="team-info-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <div>
                                            <span className="info-label">Department</span>
                                            <span className="info-value">{team.department || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="team-info-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <div>
                                            <span className="info-label">Team Lead</span>
                                            <span className="info-value">{team.head?.name || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="team-info-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <div>
                                            <span className="info-label">Members</span>
                                            <span className="info-value">{team.total_members}</span>
                                        </div>
                                    </div>

                                    <div className="team-info-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div>
                                            <span className="info-label">Complaints</span>
                                            <span className="info-value">{team.total_assigned_complaints}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button 
                                        className="view-team-btn"
                                        onClick={() => fetchTeamDetails(team._id)}
                                        style={{ flex: 1 }}
                                    >
                                        View Details
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    {team.head?._id === user?._id && (
                                        <button 
                                            className="delete-team-btn"
                                            onClick={() => handleDeleteTeam(team._id)}
                                            title="Delete Team"
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Team Details Modal */}
                {teamDetails && (
                    <div className="modal-overlay" onClick={() => { setTeamDetails(null); setSelectedTeam(null); }}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{teamDetails.name}</h2>
                                <button className="modal-close" onClick={() => { setTeamDetails(null); setSelectedTeam(null); }}>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="detail-section">
                                    <h3>Team Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Category:</span>
                                            <span className="detail-value">{categoryLabels[teamDetails.category]}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Department:</span>
                                            <span className="detail-value">{teamDetails.department_id?.name || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Team Level:</span>
                                            <span className="detail-value">{teamDetails.team_level.toFixed(2)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Team Head:</span>
                                            <span className="detail-value">{teamDetails.head?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3>Team Members ({teamDetails.members?.length || 0})</h3>
                                        {teamDetails.head?._id === user?._id && (
                                            <button 
                                                className="action-btn"
                                                onClick={() => {
                                                    // Reset pagination state
                                                    setOfficersPage(1);
                                                    setHasMoreOfficers(true);
                                                    setAvailableOfficers([]);
                                                    // Fetch first page
                                                    fetchAvailableOfficers(1);
                                                    setShowMemberModal(true);
                                                }}
                                            >
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add Member
                                            </button>
                                        )}
                                    </div>
                                    <div className="members-list">
                                        {teamDetails.members?.map((member) => (
                                            <div key={member._id} className="member-item">
                                                <div className="member-avatar">
                                                    {member.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="member-info">
                                                    <div className="member-name">{member.name}</div>
                                                    <div className="member-email">{member.email}</div>
                                                    <div className="member-category">{categoryLabels[member.officer_category]}</div>
                                                </div>
                                                {teamDetails.head?._id === user?._id && member._id !== teamDetails.head._id && (
                                                    <button 
                                                        className="remove-btn"
                                                        onClick={() => handleRemoveMember(member._id)}
                                                        title="Remove Member"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3>Assigned Complaints ({teamDetails.assigned_complaints?.length || 0})</h3>
                                        <button 
                                            className="action-btn"
                                            onClick={() => {
                                                fetchAvailableComplaints();
                                                setShowComplaintModal(true);
                                            }}
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Assign Complaint
                                        </button>
                                    </div>
                                    <div className="complaints-list">
                                        {teamDetails.assigned_complaints?.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                                                No complaints assigned yet
                                            </p>
                                        ) : (
                                            teamDetails.assigned_complaints?.map((complaint) => (
                                                <div key={complaint._id} className="complaint-item">
                                                    <div className="complaint-info">
                                                        <div className="complaint-title">{complaint.title}</div>
                                                        <div className="complaint-meta">
                                                            <span className={`severity-badge severity-${complaint.severity}`}>
                                                                {complaint.severity}
                                                            </span>
                                                            <span className="complaint-status">{complaint.status}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        className="remove-btn"
                                                        onClick={() => handleRemoveComplaint(complaint._id)}
                                                        title="Remove Complaint"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Team Modal */}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Create New Team</h2>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreateTeam}>
                                <div className="form-group">
                                    <label>Team Name</label>
                                    <input
                                        type="text"
                                        value={newTeam.name}
                                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                        required
                                        placeholder="Enter team name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <input
                                        type="text"
                                        value={categoryLabels[newTeam.category]}
                                        disabled
                                        style={{ backgroundColor: '#f0f0f0' }}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Select Team Members (Optional)</label>
                                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                                        Officers within 200km radius - {selectedMembers.length} selected
                                    </p>
                                    
                                    <div 
                                        className="officer-list"
                                        onScroll={(e) => {
                                            const { scrollTop, scrollHeight, clientHeight } = e.target;
                                            if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreOfficers && !loadingOfficers) {
                                                loadMoreOfficers();
                                            }
                                        }}
                                        style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '0.5rem' }}
                                    >
                                        {availableOfficers.length === 0 && !loadingOfficers ? (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                                No officers found within 200km radius
                                            </div>
                                        ) : (
                                            <>
                                                {availableOfficers.map((officer) => {
                                                    const isSelected = selectedMembers.includes(officer._id);
                                                    return (
                                                        <div 
                                                            key={officer._id} 
                                                            className="officer-item"
                                                            style={{
                                                                backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                                                                border: isSelected ? '2px solid #2196f3' : '1px solid #ddd',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                setSelectedMembers(prev => 
                                                                    isSelected 
                                                                        ? prev.filter(id => id !== officer._id)
                                                                        : [...prev, officer._id]
                                                                );
                                                            }}
                                                        >
                                                            <div className="member-avatar">
                                                                {officer.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div className="member-info">
                                                                <div className="member-name">{officer.name}</div>
                                                                <div className="member-email">{officer.email}</div>
                                                                {officer.user_level && (
                                                                    <div className="member-category">Level {officer.user_level}</div>
                                                                )}
                                                            </div>
                                                            <div style={{ marginLeft: 'auto' }}>
                                                                {isSelected ? (
                                                                    <svg style={{ width: '24px', height: '24px', color: '#2196f3' }} fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                    </svg>
                                                                ) : (
                                                                    <div style={{ width: '24px', height: '24px', border: '2px solid #ddd', borderRadius: '4px' }}></div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {loadingOfficers && (
                                                    <div style={{ 
                                                        textAlign: 'center', 
                                                        padding: '1rem',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div style={{
                                                            width: '30px',
                                                            height: '30px',
                                                            border: '3px solid rgba(0, 0, 0, 0.1)',
                                                            borderTop: '3px solid #007bff',
                                                            borderRadius: '50%',
                                                            animation: 'spin 1s linear infinite'
                                                        }}></div>
                                                    </div>
                                                )}
                                                {!hasMoreOfficers && availableOfficers.length > 0 && (
                                                    <div style={{ 
                                                        textAlign: 'center', 
                                                        padding: '1rem', 
                                                        color: '#666',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        No more officers to load
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Create Team {selectedMembers.length > 0 && `(${selectedMembers.length} members)`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Member Modal */}
                {showMemberModal && (
                    <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
                        <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Add Team Member</h2>
                                <button className="modal-close" onClick={() => setShowMemberModal(false)}>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div 
                                    className="officer-list"
                                    onScroll={(e) => {
                                        const { scrollTop, scrollHeight, clientHeight } = e.target;
                                        // Load more when user scrolls near bottom (50px threshold)
                                        if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreOfficers && !loadingOfficers) {
                                            loadMoreOfficers();
                                        }
                                    }}
                                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                                >
                                    {availableOfficers.length === 0 && !loadingOfficers ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                            No officers found within 200km radius
                                        </div>
                                    ) : (
                                        <>
                                            {availableOfficers.map((officer) => (
                                                <div key={officer._id} className="officer-item">
                                                    <div className="member-avatar">
                                                        {officer.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div className="member-info">
                                                        <div className="member-name">{officer.name}</div>
                                                        <div className="member-email">{officer.email}</div>
                                                        {officer.user_level && (
                                                            <div className="member-category">Level {officer.user_level}</div>
                                                        )}
                                                    </div>
                                                    <button 
                                                        className="btn-add"
                                                        onClick={() => handleAddMember(officer._id)}
                                                        disabled={loadingOfficers}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                            {loadingOfficers && (
                                                <div style={{ 
                                                    textAlign: 'center', 
                                                    padding: '1rem',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        border: '3px solid rgba(0, 0, 0, 0.1)',
                                                        borderTop: '3px solid #007bff',
                                                        borderRadius: '50%',
                                                        animation: 'spin 1s linear infinite'
                                                    }}></div>
                                                </div>
                                            )}
                                            {!hasMoreOfficers && availableOfficers.length > 0 && (
                                                <div style={{ 
                                                    textAlign: 'center', 
                                                    padding: '1rem', 
                                                    color: '#666',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    No more officers to load
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assign Complaint Modal */}
                {showComplaintModal && (
                    <div className="modal-overlay" onClick={() => setShowComplaintModal(false)}>
                        <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Assign Complaint</h2>
                                <button className="modal-close" onClick={() => setShowComplaintModal(false)}>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="complaint-list">
                                    {availableComplaints.map((complaint) => (
                                        <div key={complaint._id} className="complaint-item-select">
                                            <div className="complaint-info">
                                                <div className="complaint-title">{complaint.title}</div>
                                                <div className="complaint-description">{complaint.description?.substring(0, 100)}...</div>
                                                <span className={`severity-badge severity-${complaint.severity}`}>
                                                    {complaint.severity}
                                                </span>
                                            </div>
                                            <button 
                                                className="btn-add"
                                                onClick={() => handleAssignComplaint(complaint._id)}
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default OfficerTeams;
