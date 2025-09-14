import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from 'react-hot-toast';
import Navbar from "./Navbar";
import Footer from "./Footer";
import CommentModal from "./CommentModal.jsx";
import { 
  FiThumbsUp, 
  FiThumbsDown, 
  FiMessageCircle, 
  FiMapPin, 
  FiCalendar,
  FiUser,
  FiAlertTriangle,
  FiCheckCircle,
  FiArrowLeft,
  FiExternalLink,
  FiEdit3,
  FiTrash2
} from 'react-icons/fi';
import { 
  MdLocalFireDepartment,
  MdBalance,
  MdConstruction,
  MdTrain
} from 'react-icons/md';
import { 
    fetchComplaintById,
    upvoteComplaint,
    downvoteComplaint,
    updateComplaintStatus,
    deleteComplaint,
    fetchComments,
    clearSuccess,
    clearError
} from './auth/redux/complaintSlice';
import "./Complaint.css";
import "./ComplaintDetail.css";
import "./Toast.css";

export default function ComplaintDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const { 
        selectedComplaint, 
        isLoading, 
        error,
        success 
    } = useSelector((state) => state.complaints);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    
    const [votingInProgress, setVotingInProgress] = useState(false);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [statusUpdateInProgress, setStatusUpdateInProgress] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    // Fetch complaint details on component mount
    useEffect(() => {
        if (id) {
            dispatch(fetchComplaintById(id));
        }
        
        // Scroll to top when component mounts with a slight delay for better UX
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        };
        
        // Immediate scroll
        scrollToTop();
        
        // Backup scroll after a short delay (in case of slow rendering)
        const timeoutId = setTimeout(scrollToTop, 100);
        
        return () => clearTimeout(timeoutId);
    }, [id, dispatch]);

    // Handle success and error states
    useEffect(() => {
        if (success) {
            dispatch(clearSuccess());
        }
        if (error) {
            toast.error(error, {
                duration: 3000,
                position: 'top-center',
            });
            dispatch(clearError());
        }
    }, [success, error, dispatch]);

    const categories = [
        { value: 'rail', label: 'Rail Incidents', icon: <MdTrain />, color: '#f59e0b' },
        { value: 'road', label: 'Road Issues', icon: <MdConstruction />, color: '#db2777' },
        { value: 'fire', label: 'Fire Emergency', icon: <MdLocalFireDepartment />, color: '#ef4444' },
        { value: 'cyber', label: 'Cyber Crime', icon: <FiAlertTriangle />, color: '#8b5cf6' },
        { value: 'police', label: 'Police', icon: <FiAlertTriangle />, color: '#3b82f6' },
        { value: 'court', label: 'Court', icon: <MdBalance />, color: '#10b981' }
    ];

    const getCategoryIcon = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.icon : <FiAlertTriangle />;
    };

    const getCategoryColor = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.color : '#6b7280';
    };

    const getCategoryLabel = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.label : category;
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'status-badge-pending';
            case 'in-progress': return 'status-badge-in-progress';
            case 'resolved': return 'status-badge-resolved';
            case 'rejected': return 'status-badge-rejected';
            default: return 'status-badge-pending';
        }
    };

    const getSeverityInfo = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'low':
                return { label: 'Low', class: 'cd-severity-low', icon: '🟢' };
            case 'medium':
                return { label: 'Medium', class: 'cd-severity-medium', icon: '🟡' };
            case 'high':
                return { label: 'High', class: 'cd-severity-high', icon: '🟠' };
            case 'critical':
                return { label: 'Critical', class: 'cd-severity-critical', icon: '🔴' };
            default:
                return { label: 'Unknown', class: 'cd-severity-medium', icon: '🟡' };
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleUpvote = async () => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to vote', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setVotingInProgress(true);
        try {
            await dispatch(upvoteComplaint(id));
            // Refresh complaint data
            dispatch(fetchComplaintById(id));
        } catch (error) {
            toast.error('❌ Failed to upvote. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setVotingInProgress(false);
        }
    };

    const handleDownvote = async () => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to vote', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setVotingInProgress(true);
        try {
            await dispatch(downvoteComplaint(id));
            // Refresh complaint data
            dispatch(fetchComplaintById(id));
        } catch (error) {
            toast.error('❌ Failed to downvote. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setVotingInProgress(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to update status', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setStatusUpdateInProgress(true);
        try {
            await dispatch(updateComplaintStatus({ complaintId: id, status: newStatus }));
            // Refresh complaint data
            dispatch(fetchComplaintById(id));
            toast.success('Status updated successfully!', {
                duration: 2000,
                position: 'top-center',
            });
        } catch (error) {
            toast.error('❌ Failed to update status. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setStatusUpdateInProgress(false);
        }
    };

    const handleDeleteComplaint = async () => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to delete complaint', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
            return;
        }

        setDeleteInProgress(true);
        try {
            await dispatch(deleteComplaint(id));
            toast.success('Complaint deleted successfully!', {
                duration: 2000,
                position: 'top-center',
            });
            navigate('/complain');
        } catch (error) {
            toast.error('❌ Failed to delete complaint. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setDeleteInProgress(false);
        }
    };

    const openCommentModal = () => {
        setCommentModalOpen(true);
        dispatch(fetchComments(id));
    };

    const closeCommentModal = () => {
        setCommentModalOpen(false);
    };

    const handleCommentSubmit = async (commentData) => {
        // This will be handled by CommentModal
        return true;
    };

    const handleCommentUpdate = async (commentId, updateData) => {
        // This will be handled by CommentModal
        return true;
    };

    const handleCommentDelete = async (commentId) => {
        // This will be handled by CommentModal
        return true;
    };

    if (isLoading) {
        return (
            <>
                <Navbar />
                <div className="cd-page-wrapper">
                    <div className="cd-main-container">
                        <div className="cd-loading-wrapper">
                            <div className="cd-loading-animation"></div>
                            <p className="cd-loading-message">Loading complaint details...</p>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (error && !selectedComplaint) {
        return (
            <>
                <Navbar />
                <div className="cd-page-wrapper">
                    <div className="cd-main-container">
                        <div className="cd-error-wrapper">
                            <FiAlertTriangle className="cd-error-icon" />
                            <h2>Complaint Not Found</h2>
                            <p>The complaint you're looking for doesn't exist or has been removed.</p>
                            <button 
                                className="cd-primary-btn"
                                onClick={() => navigate('/complain?tab=view')}
                            >
                                <FiArrowLeft /> Back to Complaints
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (!selectedComplaint) {
        return (
            <>
                <Navbar />
                <div className="cd-page-wrapper">
                    <div className="cd-main-container">
                        <div className="cd-error-wrapper">
                            <FiAlertTriangle className="cd-error-icon" />
                            <h2>No Complaint Data</h2>
                            <p>Unable to load complaint details. Please try again.</p>
                            <button 
                                className="cd-primary-btn"
                                onClick={() => navigate('/complain?tab=view')}
                            >
                                <FiArrowLeft /> Back to Complaints
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const severityInfo = getSeverityInfo(selectedComplaint.severity);
    const canEdit = isAuthenticated && user && (user._id === selectedComplaint.userId || user.role === 'admin');

    return (
        <>
            <Navbar />
            <div className="cd-page-wrapper">
                <div className="cd-main-container">
                    {/* Header with back button */}
                    <div className="cd-header-section">
                        <button 
                            className="cd-nav-back-btn"
                            onClick={() => navigate('/complain?tab=view')}
                        >
                            <FiArrowLeft /> Back to Complaints
                        </button>
                        
                        {canEdit && (
                            <div className="cd-header-actions">
                                <button 
                                    className="cd-edit-action-btn"
                                    onClick={() => navigate(`/complain?edit=${id}`)}
                                    disabled={deleteInProgress}
                                >
                                    <FiEdit3 /> Edit
                                </button>
                                <button 
                                    className="cd-delete-action-btn"
                                    onClick={handleDeleteComplaint}
                                    disabled={deleteInProgress}
                                >
                                    {deleteInProgress ? (
                                        <div className="cd-loading-spinner-small"></div>
                                    ) : (
                                        <><FiTrash2 /> Delete</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Main complaint card */}
                    <div className="cd-primary-card">
                        {/* Card Header */}
                        <div className="cd-card-header-wrapper">
                            <div className="cd-header-top-row">
                                <div className="cd-header-left-section">
                                    <div className="cd-category-display">
                                        <span 
                                            className="cd-category-icon-wrapper" 
                                            style={{ backgroundColor: getCategoryColor(selectedComplaint.category) }}
                                        >
                                            {getCategoryIcon(selectedComplaint.category)}
                                        </span>
                                        <span className="cd-category-label-text">
                                            {getCategoryLabel(selectedComplaint.category)}
                                        </span>
                                    </div>
                                    <div className="cd-severity-display">
                                        <span className={`cd-severity-indicator ${severityInfo.class}`}>
                                            {severityInfo.icon} {severityInfo.label}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="cd-header-right-section">
                                    <span className={`cd-status-indicator ${getStatusBadgeClass(selectedComplaint.status)}`}>
                                        {selectedComplaint.status?.replace('-', ' ').toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="cd-content-body">
                            <div className="cd-title-wrapper">
                                <h1 className="cd-main-title">
                                    {selectedComplaint.title}
                                </h1>
                            </div>
                            
                            <div className="cd-description-wrapper">
                                <h3>Description</h3>
                                <p className="cd-description-content">
                                    {selectedComplaint.description}
                                </p>
                            </div>

                            {/* Metadata */}
                            <div className="cd-metadata-wrapper">
                                <div className="cd-metadata-row">
                                    <div className="cd-metadata-single-item">
                                        <FiUser className="cd-metadata-icon" />
                                        <span>Submitted by: {selectedComplaint.userName || 'Anonymous'}</span>
                                    </div>
                                    <div className="cd-metadata-single-item">
                                        <FiCalendar className="cd-metadata-icon" />
                                        <span>Created: {formatDate(selectedComplaint.createdAt)}</span>
                                    </div>
                                </div>
                                
                                {selectedComplaint.updatedAt !== selectedComplaint.createdAt && (
                                    <div className="cd-metadata-row">
                                        <div className="cd-metadata-single-item">
                                            <FiCalendar className="cd-metadata-icon" />
                                            <span>Last updated: {formatDate(selectedComplaint.updatedAt)}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {selectedComplaint.location && (
                                    <div className="cd-metadata-row">
                                        <div className="cd-metadata-single-item">
                                            <FiMapPin className="cd-metadata-icon" />
                                            <span>
                                                Location: {selectedComplaint.address || 
                                                `${selectedComplaint.location.latitude?.toFixed(6)}, ${selectedComplaint.location.longitude?.toFixed(6)}`}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {selectedComplaint.trainNumber && (
                                    <div className="cd-metadata-row">
                                        <div className="cd-metadata-single-item">
                                            <MdTrain className="cd-metadata-icon" />
                                            <span>Train Number: {selectedComplaint.trainNumber}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Voting and Actions */}
                            <div className="cd-interactions-wrapper">
                                <div className="cd-voting-controls">
                                    <button
                                        className={`cd-vote-button cd-upvote-button ${selectedComplaint.userVote === 'upvote' ? 'cd-voted' : ''}`}
                                        onClick={handleUpvote}
                                        disabled={votingInProgress}
                                        title="Upvote this complaint"
                                    >
                                        <FiThumbsUp />
                                        <span>{selectedComplaint.upvotes || 0}</span>
                                    </button>
                                    
                                    <button
                                        className={`cd-vote-button cd-downvote-button ${selectedComplaint.userVote === 'downvote' ? 'cd-voted' : ''}`}
                                        onClick={handleDownvote}
                                        disabled={votingInProgress}
                                        title="Downvote this complaint"
                                    >
                                        <FiThumbsDown />
                                        <span>{selectedComplaint.downvotes || 0}</span>
                                    </button>
                                </div>

                                <div className="cd-utility-buttons">
                                    <button
                                        className="cd-comments-btn"
                                        onClick={openCommentModal}
                                    >
                                        <FiMessageCircle />
                                        Comments ({selectedComplaint.commentCount || 0})
                                    </button>
                                    
                                    {selectedComplaint.location && (
                                        <button
                                            className="cd-map-view-btn"
                                            onClick={() => {
                                                const { latitude, longitude } = selectedComplaint.location;
                                                window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
                                            }}
                                        >
                                            <FiExternalLink />
                                            View on Map
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status Update Section (for admins or complaint owner) */}
                            {canEdit && (
                                <div className="cd-status-management">
                                    <h3>Update Status</h3>
                                    <div className="cd-status-controls">
                                        {['pending', 'in-progress', 'resolved', 'rejected'].map((status) => (
                                            <button
                                                key={status}
                                                className={`cd-status-option-btn ${selectedComplaint.status === status ? 'cd-active-status' : ''}`}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={statusUpdateInProgress}
                                            >
                                                {status.replace('-', ' ').toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comment Modal */}
                {commentModalOpen && (
                    <CommentModal
                        complaint={selectedComplaint}
                        onClose={closeCommentModal}
                        onCommentSubmit={handleCommentSubmit}
                        onCommentUpdate={handleCommentUpdate}
                        onCommentDelete={handleCommentDelete}
                    />
                )}
            </div>
            <Footer />
        </>
    );
}