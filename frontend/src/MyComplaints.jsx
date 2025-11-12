import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useMyComplaintsCache } from "./hooks/useMyComplaintsCache.jsx";
import { 
  FiThumbsUp, 
  FiThumbsDown, 
  FiMessageCircle, 
  FiExternalLink
} from 'react-icons/fi';
import { 
  MdLocalFireDepartment,
  MdBalance,
  MdLocalHospital,
  MdWater,
  MdConstruction,
  MdWarning,
  MdElectricalServices,
  MdTrain,
  MdDirectionsRailway
} from 'react-icons/md';
import CommentModal from "./CommentModal.jsx";
import { 
    getUserComplaints,
    upvoteComplaint,
    downvoteComplaint,
    updateComplaintStatus,
    deleteComplaint,
    addComment,
    fetchComments,
    updateComment,
    removeComment,
    clearError
} from './auth/redux/complaintSlice';
import './MyComplaintsPagination.css';

function MyComplaints() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    
    // State for complaint management
    const [expandedComments, setExpandedComments] = useState({});
    const [votingInProgress, setVotingInProgress] = useState({});
    const [statusUpdateInProgress, setStatusUpdateInProgress] = useState({});
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedComplaintForStatus, setSelectedComplaintForStatus] = useState(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedComplaintForDelete, setSelectedComplaintForDelete] = useState(null);
    const [deleteInProgress, setDeleteInProgress] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedComplaintForComments, setSelectedComplaintForComments] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [commentInProgress, setCommentInProgress] = useState(false);
    const [commentRating, setCommentRating] = useState(5);
    const [editingComment, setEditingComment] = useState(null);
    const [editedCommentText, setEditedCommentText] = useState('');
    const [editedCommentRating, setEditedCommentRating] = useState(5);
    const [editInProgress, setEditInProgress] = useState(false);
    const [deletingComment, setDeletingComment] = useState(null);
    const [updatingComment, setUpdatingComment] = useState(null);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    
    // Use the infinite query hook with selected category
    const { 
        data, 
        fetchNextPage, 
        hasNextPage, 
        isFetchingNextPage, 
        status, 
        error,
        interactionCount,
        recordInteraction,
        clearCacheAndRefetch,
        isUsingCache,
        interactionsRemaining,
        totalCount,
        isLoading,
        isFetching
    } = useMyComplaintsCache(selectedCategory);

    const categories = [
        { value: 'rail', label: 'Rail Incidents', icon: <MdTrain />, color: '#f59e0b' },
        { value: 'road', label: 'Road Issues', icon: <MdConstruction />, color: '#db2777' },
        { value: 'fire', label: 'Fire Emergency', icon: <MdLocalFireDepartment />, color: '#ef4444' },
        { value: 'cyber', label: 'Cyber Crime', icon: <MdWarning />, color: '#8b5cf6' },
        { value: 'police', label: 'Police', icon: <MdWarning />, color: '#3b82f6' },
        { value: 'court', label: 'Court', icon: <MdBalance />, color: '#10b981' }
    ];

    // Intersection observer for infinite scrolling
    const { ref } = useInView({
        threshold: 1,
        onChange: (inView) => {
            if (inView && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    // Get all complaints from pages
    const allComplaints = data?.pages?.flatMap(page => page.complaints) || [];

    // Fetch comments for visible complaints when data loads
    useEffect(() => {
        if (allComplaints.length > 0) {
            console.log('Loading comments for visible complaints...', allComplaints.length);
            allComplaints.forEach((complaint) => {
                if (complaint._id) {
                    dispatch(fetchComments(complaint._id)).catch((err) => {
                        console.warn(`Failed to load comments for complaint ${complaint._id}:`, err);
                    });
                }
            });
        }
    }, [data?.pages?.length]); // Only trigger when new pages are loaded

    // Scroll to top when category changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedCategory]);

    // Handle ESC key to close modals
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                if (statusModalOpen) {
                    closeStatusModal();
                } else if (deleteModalOpen) {
                    closeDeleteModal();
                } else if (commentModalOpen) {
                    closeCommentModal();
                }
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [statusModalOpen, deleteModalOpen, commentModalOpen]);

    // Helper functions
    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'status-pending';
            case 'in-progress': case 'in_progress': return 'status-in-progress';
            case 'resolved': return 'status-resolved';
            case 'rejected': return 'status-rejected';
            default: return 'status-pending';
        }
    };

    const mapStatusToBackend = (frontendStatus) => {
        const statusMap = {
            'pending': 'pending',
            'in-progress': 'in_progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMap[frontendStatus] || frontendStatus;
    };

    const mapStatusToFrontend = (backendStatus) => {
        const statusMap = {
            'pending': 'pending',
            'in_progress': 'in-progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMap[backendStatus] || backendStatus;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) {
            return `${diffInSeconds} seconds ago`;
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        } else if (diffInDays < 7) {
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const getCategoryIcon = (category) => {
        const categoryObj = categories.find(cat => cat.value === category);
        return categoryObj ? categoryObj.icon : <MdWarning />;
    };

    const getCategoryColor = (category) => {
        const categoryObj = categories.find(cat => cat.value === category);
        return categoryObj ? categoryObj.color : '#6b7280';
    };

    const getSeverityInfo = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'low':
                return {
                    label: 'Low',
                    icon: '🟢',
                    color: '#10b981',
                    bgColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.3)'
                };
            case 'medium':
                return {
                    label: 'Medium',
                    icon: '🟡',
                    color: '#f59e0b',
                    bgColor: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.3)'
                };
            case 'high':
                return {
                    label: 'High',
                    icon: '🔴',
                    color: '#ef4444',
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)'
                };
            default:
                return {
                    label: 'Medium',
                    icon: '🟡',
                    color: '#f59e0b',
                    bgColor: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.3)'
                };
        }
    };

    // Action handlers
    const handleUpvote = async (complaintId) => {
        if (votingInProgress[complaintId]) return;
        
        setVotingInProgress(prev => ({ ...prev, [complaintId]: true }));
        try {
            await dispatch(upvoteComplaint(complaintId));
            recordInteraction(); // Track interaction for cache management
        } finally {
            setVotingInProgress(prev => ({ ...prev, [complaintId]: false }));
        }
    };

    const handleDownvote = async (complaintId) => {
        if (votingInProgress[complaintId]) return;
        
        setVotingInProgress(prev => ({ ...prev, [complaintId]: true }));
        try {
            await dispatch(downvoteComplaint(complaintId));
            recordInteraction(); // Track interaction for cache management
        } finally {
            setVotingInProgress(prev => ({ ...prev, [complaintId]: false }));
        }
    };

    const handleStatusUpdate = async (complaintId, newStatus) => {
        setStatusUpdateInProgress(prev => ({ ...prev, [complaintId]: true }));
        try {
            const backendStatus = mapStatusToBackend(newStatus);
            await dispatch(updateComplaintStatus({ 
                complaintId, 
                status: backendStatus 
            }));
        } finally {
            setStatusUpdateInProgress(prev => ({ ...prev, [complaintId]: false }));
            closeStatusModal();
        }
    };

    const openStatusModal = (complaint) => {
        setSelectedComplaintForStatus(complaint);
        setStatusModalOpen(true);
        setScrollPosition(window.pageYOffset);
        document.body.style.overflow = 'hidden';
    };

    const closeStatusModal = () => {
        setStatusModalOpen(false);
        setSelectedComplaintForStatus(null);
        document.body.style.overflow = 'unset';
        window.scrollTo(0, scrollPosition);
    };

    const openDeleteModal = (complaint) => {
        setSelectedComplaintForDelete(complaint);
        setDeleteModalOpen(true);
        setScrollPosition(window.pageYOffset);
        document.body.style.overflow = 'hidden';
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedComplaintForDelete(null);
        document.body.style.overflow = 'unset';
        window.scrollTo(0, scrollPosition);
    };

    const handleDeleteComplaint = async (complaintId) => {
        setDeleteInProgress(prev => ({ ...prev, [complaintId]: true }));
        try {
            await dispatch(deleteComplaint(complaintId));
        } finally {
            setDeleteInProgress(prev => ({ ...prev, [complaintId]: false }));
            closeDeleteModal();
        }
    };

    const handleVisitComplaint = useCallback((complaint) => {
        console.log('clicked');
        // Clear any potential state conflicts and navigate
        setTimeout(() => {
            console.log(`/complaint/${complaint._id}`);
            navigate(`/complaint/${complaint._id}`, { replace: true });
        }, 0);
    }, [navigate]);

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < rating ? 'star filled' : 'star'}>
                ★
            </span>
        ));
    };

    const toggleComments = (complaintId) => {
        setExpandedComments(prev => ({
            ...prev,
            [complaintId]: !prev[complaintId]
        }));
    };

    const openCommentModal = (complaint) => {
        setSelectedComplaintForComments(complaint);
        setCommentModalOpen(true);
        setScrollPosition(window.pageYOffset);
        document.body.style.overflow = 'hidden';
    };

    const closeCommentModal = () => {
        setCommentModalOpen(false);
        setSelectedComplaintForComments(null);
        setNewComment('');
        setCommentRating(5);
        setEditingComment(null);
        setEditedCommentText('');
        setEditedCommentRating(5);
        document.body.style.overflow = 'unset';
        window.scrollTo(0, scrollPosition);
    };

    const handleCommentSubmit = async () => {
        if (!newComment.trim() || !selectedComplaintForComments) return;
        
        setCommentInProgress(true);
        try {
            await dispatch(addComment({
                complaintId: selectedComplaintForComments._id,
                content: newComment,
                rating: commentRating
            }));
            recordInteraction(); // Track interaction for cache management
            setNewComment('');
            setCommentRating(5);
        } finally {
            setCommentInProgress(false);
        }
    };

    const startEditingComment = (comment) => {
        setEditingComment(comment._id);
        setEditedCommentText(comment.text);
        setEditedCommentRating(comment.rating);
    };

    const cancelEditingComment = () => {
        setEditingComment(null);
        setEditedCommentText('');
        setEditedCommentRating(5);
    };

    const saveEditedComment = async (commentId) => {
        setEditInProgress(true);
        try {
            await dispatch(updateComment({
                commentId,
                text: editedCommentText,
                rating: editedCommentRating
            }));
            setEditingComment(null);
            setEditedCommentText('');
            setEditedCommentRating(5);
        } finally {
            setEditInProgress(false);
        }
    };

    const deleteComment = async (commentId) => {
        setDeletingComment(commentId);
        try {
            await dispatch(removeComment(commentId));
        } finally {
            setDeletingComment(null);
        }
    };

    const handleModalCommentSubmit = async (commentData) => {
        if (!selectedComplaintForComments) return;
        
        await dispatch(addComment({
            complaintId: selectedComplaintForComments._id,
            ...commentData
        }));
    };

    const handleModalCommentUpdate = async (commentId, updateData) => {
        await dispatch(updateComment({
            commentId,
            ...updateData
        }));
    };

    const handleModalCommentDelete = async (commentId) => {
        await dispatch(removeComment(commentId));
    };

    const highlightText = (text, searchQuery) => {
        if (!searchQuery.trim()) return text;
        
        const regex = new RegExp(`(${searchQuery})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, index) => 
            regex.test(part) ? (
                <mark key={index} className="search-highlight">{part}</mark>
            ) : part
        );
    };

    // Filter complaints based on search query only (category is now handled by backend)
    const filteredComplaints = allComplaints.filter(complaint => {
        const matchesSearch = searchQuery === '' || 
            complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            complaint.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesSearch;
    });

    // Loading state - only show on initial load (when no data exists yet)
    if (isLoading && !data) {
        return (
            <div className="profile-card">
                <div className="my-complaints-loading-container">
                    <div className="spinner"></div>
                    <p>Loading your complaints...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (status === "error") {
        return (
            <div className="profile-card">
                <div className="my-complaints-error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Error Loading Complaints</h3>
                    <p>{error?.message || "Failed to load your complaints. Please try again."}</p>
                    <button 
                        className="my-complaints-retry-button"
                        onClick={() => clearCacheAndRefetch()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // No data state - only show when we have data but it's empty (not while loading)
    if (!isFetching && (!data || !data.pages || data.pages.length === 0 || allComplaints.length === 0)) {
        return (
            <div className="profile-card">
                <div className="my-complaints-empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No Complaints Yet</h3>
                    <p>You haven't submitted any complaints yet. Start by creating one!</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="profile-card">
                <div className="empty-state">
                    <div className="empty-icon">🔐</div>
                    <h3>Authentication Required</h3>
                    <p>Please log in to view your complaints</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-card">
            <div className="section-header">
                <h2 className="section-title">My Complaints</h2>
                <p className="section-subtitle">Track the status of your submitted complaints</p>
            </div>

            <div className="my-complaints-list">
                {/* Loading overlay for category switching - only show when fetching but NOT fetching next page */}
                {isFetching && data && !isFetchingNextPage && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                        borderRadius: '12px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div className="spinner"></div>
                            <p style={{ marginTop: '1rem', color: '#666' }}>Loading complaints...</p>
                        </div>
                    </div>
                )}
                
                {/* Search and Filter Section */}
                {allComplaints.length > 0 && (
                    <div className="search-filter-section">
                        <div className="search-bar-container">
                            <div className="search-input-wrapper">
                                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search complaints by title or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button 
                                        className="clear-search-btn"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="category-filter-wrapper">
                                <select
                                    className="category-filter"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map(category => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* Results Summary */}
                        <div className="results-summary">
                            <span className="results-count">
                                Showing {filteredComplaints.length} of {totalCount} complaints
                                {selectedCategory !== 'all' && (
                                    <span className="category-indicator">
                                        {' '}in {categories.find(c => c.value === selectedCategory)?.label || selectedCategory}
                                    </span>
                                )}
                            </span>
                            {(searchQuery || selectedCategory !== 'all') && (
                                <button 
                                    className="clear-filters-btn"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {filteredComplaints.length === 0 && allComplaints.length > 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <h3>No Complaints Found</h3>
                        <p>
                            {searchQuery && selectedCategory !== 'all' 
                                ? `No complaints found matching "${searchQuery}" in ${categories.find(cat => cat.value === selectedCategory)?.label || selectedCategory} category.`
                                : searchQuery 
                                ? `No complaints found matching "${searchQuery}".`
                                : `No complaints found in ${categories.find(cat => cat.value === selectedCategory)?.label || selectedCategory} category.`
                            }
                        </p>
                        <button 
                            className="clear-filters-btn"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="my-complaints-grid">
                        {filteredComplaints.map((complaint, index) => (
                            <div key={complaint._id || index} className="my-complaint-card">
                                <div className="my-complaint-card-header">
                                    <div className="my-complaint-card-header-left">
                                        <div className="my-complaint-category">
                                            <span 
                                                className="my-category-icon-display"
                                                style={{ color: getCategoryColor(complaint.category) }}
                                            >
                                                {getCategoryIcon(complaint.category)}
                                            </span>
                                            <span className="my-category-name">
                                                {categories.find(cat => cat.value === complaint.category)?.label || complaint.category}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="my-card-header-right">
                                        <span className={`my-status-badge ${getStatusBadgeClass(complaint.status)}`}>
                                            {mapStatusToFrontend(complaint.status).replace('-', ' ').toUpperCase()}
                                        </span>
                                        <button
                                            className="my-delete-btn-icon"
                                            onClick={() => openDeleteModal(complaint)}
                                            disabled={deleteInProgress[complaint._id]}
                                            title="Delete Complaint"
                                        >
                                            {deleteInProgress[complaint._id] ? (
                                                <div className="btn-spinner-small"></div>
                                            ) : (
                                                <svg className="my-delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            className="my-visit-btn-icon"
                                            onClick={() => handleVisitComplaint(complaint)}
                                            title="Visit Complaint Details"
                                        >
                                            <FiExternalLink className="my-delete-icon" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="my-complaint-card-body">
                                    <div className="my-complaint-title-section">
                                        <h4 className="my-complaint-title-display">
                                            {searchQuery ? highlightText(complaint.title, searchQuery) : complaint.title}
                                        </h4>
                                        
                                        {/* Severity Display */}
                                        {complaint.severity && (
                                            <div className="my-complaint-severity">
                                                <div 
                                                    className="my-severity-badge-display"
                                                    style={{
                                                        color: getSeverityInfo(complaint.severity).color,
                                                        backgroundColor: getSeverityInfo(complaint.severity).bgColor,
                                                        border: `1px solid ${getSeverityInfo(complaint.severity).borderColor}`
                                                    }}
                                                >
                                                    <span className="my-severity-icon-display" style={{ color: getSeverityInfo(complaint.severity).color }}>
                                                        {getSeverityInfo(complaint.severity).icon}
                                                    </span>
                                                    <span className="my-severity-text">
                                                        {getSeverityInfo(complaint.severity).label}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="my-complaint-description-display">
                                        {searchQuery ? highlightText(complaint.description, searchQuery) : complaint.description}
                                    </p>
                                    
                                    {complaint.address && (
                                        <div className="my-complaint-location">
                                            <svg className="my-location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>{complaint.address}</span>
                                        </div>
                                    )}

                                    {/* Rail specific train meta */}
                                    {complaint.category === 'rail' && complaint.category_specific_data && (
                                        <div className="my-rail-train-meta">
                                            <div className="my-train-header-line">
                                                <div className="my-train-title-wrap">
                                                    <span className="my-train-emoji" role="img" aria-label="train details"><MdDirectionsRailway /></span>
                                                    <span className="my-train-name-text">{complaint.category_specific_data.train_name || complaint.category_specific_data.trainNumber || complaint.category_data_id}</span>
                                                    <span className="my-train-number-pill">{complaint.category_specific_data.train_number || complaint.category_data_id}</span>
                                                </div>
                                                {complaint.category_specific_data.train_type && (
                                                    <span className="my-train-type-badge" title="Train Type">{complaint.category_specific_data.train_type.replace(/_/g,' ')}</span>
                                                )}
                                            </div>
                                            <div className="my-train-route-grid">
                                                {(complaint.category_specific_data.routes?.from_station) && (
                                                    <div className="my-route-segment from">
                                                        <div className="my-seg-label">Origin</div>
                                                        <div className="my-seg-station">
                                                            <span className="my-station-name origin-name">{complaint.category_specific_data.routes.from_station.name}</span>
                                                            <span className="my-code origin-code">({complaint.category_specific_data.routes.from_station.code})</span>
                                                        </div>
                                                        {complaint.category_specific_data.routes.from_station.time && (
                                                            <div className="my-seg-time">Dep: {complaint.category_specific_data.routes.from_station.time.replace('.', ':')}</div>
                                                        )}
                                                    </div>
                                                )}
                                                {(complaint.category_specific_data.routes?.to_station) && (
                                                    <div className="my-route-segment to">
                                                        <div className="my-seg-label">Destination</div>
                                                        <div className="my-seg-station">
                                                            <span className="my-station-name destination-name">{complaint.category_specific_data.routes.to_station.name}</span>
                                                            <span className="my-code destination-code">({complaint.category_specific_data.routes.to_station.code})</span>
                                                        </div>
                                                        {complaint.category_specific_data.routes.to_station.time && (
                                                            <div className="my-seg-time">Arr: {complaint.category_specific_data.routes.to_station.time.replace('.', ':')}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Complaint Meta Info */}
                                    <div className="my-complaint-meta">
                                        <span className="my-complaint-date">
                                            {formatDate(complaint.createdAt)}
                                        </span>
                                        <div className="my-complaint-actions">
                                            <button
                                                className={`my-action-btn upvote ${complaint.userVote === 'upvote' ? 'voted' : ''}`}
                                                onClick={() => handleUpvote(complaint._id)}
                                                disabled={votingInProgress[complaint._id]}
                                                title="Upvote"
                                            >
                                                <FiThumbsUp />
                                                <span>{complaint.upvote || 0}</span>
                                            </button>
                                            
                                            <button
                                                className={`my-action-btn downvote ${complaint.userVote === 'downvote' ? 'voted' : ''}`}
                                                onClick={() => handleDownvote(complaint._id)}
                                                disabled={votingInProgress[complaint._id]}
                                                title="Downvote"
                                            >
                                                <FiThumbsDown />
                                                <span>{complaint.downvote || 0}</span>
                                            </button>
                                            
                                            <button
                                                className="my-action-btn comments"
                                                onClick={() => openCommentModal(complaint)}
                                                title="View Comments"
                                            >
                                                <FiMessageCircle />
                                                <span>{complaint.comments?.length || 0}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Infinite Scroll Loading Indicator */}
                {hasNextPage && (
                    <div ref={ref} className="my-complaints-loading-more-container">
                        {isFetchingNextPage ? (
                            <div className="my-complaints-loading-more">
                                <div className="my-complaints-spinner-small"></div>
                                <p>Loading more complaints...</p>
                            </div>
                        ) : (
                            <div className="my-complaints-load-more-trigger">
                                <p>Scroll to load more</p>
                            </div>
                        )}
                    </div>
                )}

                {/* End of list indicator */}
                {!hasNextPage && allComplaints.length > 0 && (
                    <div className="my-complaints-end-of-list">
                        <p>You've reached the end of your complaints</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && selectedComplaintForDelete && (
                <div className="my-delete-modal-overlay" onClick={closeDeleteModal}>
                    <div className="my-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="my-delete-modal-header">
                            <h3 className="my-delete-modal-title">Delete Complaint</h3>
                            <button className="my-delete-modal-close-btn" onClick={closeDeleteModal}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="my-delete-modal-content">
                            <div className="my-delete-modal-icon">
                                <svg className="my-delete-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            
                            <div className="my-delete-confirmation-content">
                                <h4 className="my-delete-complaint-title">{selectedComplaintForDelete.title}</h4>
                                <p className="my-delete-warning-text">
                                    Are you sure you want to delete this complaint? This action cannot be undone.
                                </p>
                                
                                <div className="my-delete-actions">
                                    <button
                                        className="my-cancel-delete-btn"
                                        onClick={closeDeleteModal}
                                        disabled={deleteInProgress[selectedComplaintForDelete._id]}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="my-confirm-delete-btn"
                                        onClick={() => handleDeleteComplaint(selectedComplaintForDelete._id)}
                                        disabled={deleteInProgress[selectedComplaintForDelete._id]}
                                    >
                                        {deleteInProgress[selectedComplaintForDelete._id] ? (
                                            <>
                                                <div className="btn-spinner"></div>
                                                <span>Deleting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="my-delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span>Delete Complaint</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comment Modal */}
            <CommentModal
                complaintId={selectedComplaintForComments?._id}
                complaintTitle={selectedComplaintForComments?.title}
                complaintCategory={selectedComplaintForComments?.category}
                complaintType={selectedComplaintForComments?.type}
                isOpen={commentModalOpen}
                onClose={closeCommentModal}
                onCommentSubmit={handleModalCommentSubmit}
                onCommentUpdate={handleModalCommentUpdate}
                onCommentDelete={handleModalCommentDelete}
                comments={
                    selectedComplaintForComments 
                        ? (allComplaints.find(c => c._id === selectedComplaintForComments._id)?.comments || [])
                        : []
                }
                totalComments={
                    selectedComplaintForComments 
                        ? (allComplaints.find(c => c._id === selectedComplaintForComments._id)?.comments?.length || 0)
                        : 0
                }
            />
        </div>
    );
}

export default MyComplaints;
