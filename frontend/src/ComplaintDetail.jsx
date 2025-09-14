import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
    addComment,
    updateComment,
    removeComment,
    clearSuccess,
    clearError
} from './auth/redux/complaintSlice';
import "./Complaint.css";
import "./ComplaintDetail.css";
import "./Toast.css";

// Fix for Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    
    const [votingInProgress, setVotingInProgress] = useState({});
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
            case 'pending': return 'cd-status-badge-pending';
            case 'in-progress': return 'cd-status-badge-in-progress';
            case 'resolved': return 'cd-status-badge-resolved';
            case 'rejected': return 'cd-status-badge-rejected';
            default: return 'cd-status-badge-pending';
        }
    };

    // Map frontend status values to backend format
    const mapStatusToBackend = (frontendStatus) => {
        const statusMapping = {
            'pending': 'pending',
            'in-progress': 'in_progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMapping[frontendStatus] || frontendStatus;
    };

    // Map backend status values to frontend format
    const mapStatusToFrontend = (backendStatus) => {
        const statusMapping = {
            'pending': 'pending',
            'in_progress': 'in-progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMapping[backendStatus] || backendStatus;
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
        
        // Set voting in progress
        setVotingInProgress(prev => ({ ...prev, [`${id}-upvote`]: true }));
        
        try {
            const result = await dispatch(upvoteComplaint(id));
            if (upvoteComplaint.fulfilled.match(result)) {
                toast.success('Upvoted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    icon: <FiThumbsUp />,
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to upvote. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while voting. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear voting in progress
            setVotingInProgress(prev => ({ ...prev, [`${id}-upvote`]: false }));
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
        
        // Set voting in progress
        setVotingInProgress(prev => ({ ...prev, [`${id}-downvote`]: true }));
        
        try {
            const result = await dispatch(downvoteComplaint(id));
            if (downvoteComplaint.fulfilled.match(result)) {
                toast.success('Downvoted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    icon: <FiThumbsDown />,
                    style: {
                        background: 'rgba(239, 68, 68, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to downvote. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while voting. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear voting in progress
            setVotingInProgress(prev => ({ ...prev, [`${id}-downvote`]: false }));
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
            // Map frontend status to backend format
            const backendStatus = mapStatusToBackend(newStatus);
            const result = await dispatch(updateComplaintStatus({ complaintId: id, status: backendStatus }));
            if (updateComplaintStatus.fulfilled.match(result)) {
                toast.success(`Status updated to ${newStatus.replace('-', ' ')}!`, {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to update status. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while updating status. Please try again.', {
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
            const result = await dispatch(deleteComplaint(id));
            if (deleteComplaint.fulfilled.match(result)) {
                toast.success('Complaint deleted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
                navigate('/complain?tab=view');
            } else {
                toast.error('❌ Failed to delete complaint. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while deleting complaint. Please try again.', {
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

    // Handler functions for CommentModal component
    const handleCommentSubmit = async (commentData) => {
        try {
            const result = await dispatch(addComment({
                complaintId: commentData.complaintId,
                content: commentData.comment,
                rating: commentData.rating
            }));

            if (addComment.fulfilled.match(result)) {
                // Fetch updated comments to refresh the comment list
                await dispatch(fetchComments(id));
                return true;
            } else {
                throw new Error(result.payload || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    };

    const handleCommentUpdate = async (commentId, updateData) => {
        try {
            const result = await dispatch(updateComment({
                commentId,
                comment: updateData.comment,
                rating: updateData.rating
            }));

            if (updateComment.fulfilled.match(result)) {
                // Fetch updated comments
                await dispatch(fetchComments(id));
                return true;
            } else {
                throw new Error(result.payload || 'Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    };

    const handleCommentDelete = async (commentId) => {
        try {
            const result = await dispatch(removeComment(commentId));

            if (removeComment.fulfilled.match(result)) {
                // Fetch updated comments to refresh the comment list
                await dispatch(fetchComments(id));
                return true;
            } else {
                throw new Error(result.payload || 'Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
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
                                    <span className={`cd-status-indicator ${getStatusBadgeClass(mapStatusToFrontend(selectedComplaint.status))}`}>
                                        {mapStatusToFrontend(selectedComplaint.status)?.replace('-', ' ').toUpperCase() || 'PENDING'}
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
                                        disabled={votingInProgress[`${id}-upvote`] || votingInProgress[`${id}-downvote`]}
                                        title="Upvote this complaint"
                                    >
                                        <FiThumbsUp />
                                        <span>{selectedComplaint.upvote || 0}</span>
                                    </button>
                                    
                                    <button
                                        className={`cd-vote-button cd-downvote-button ${selectedComplaint.userVote === 'downvote' ? 'cd-voted' : ''}`}
                                        onClick={handleDownvote}
                                        disabled={votingInProgress[`${id}-upvote`] || votingInProgress[`${id}-downvote`]}
                                        title="Downvote this complaint"
                                    >
                                        <FiThumbsDown />
                                        <span>{selectedComplaint.downvote || 0}</span>
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
                                </div>
                            </div>

                            {/* Location Map */}
                            {selectedComplaint.location && selectedComplaint.location.coordinates && (
                                <div className="cd-location-map-wrapper">
                                    <h3>Complaint Location</h3>
                                    <div className="cd-map-container">
                                        <MapContainer
                                            center={[selectedComplaint.location.coordinates[1], selectedComplaint.location.coordinates[0]]}
                                            zoom={15}
                                            style={{ height: '300px', width: '100%', borderRadius: '12px' }}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Marker position={[selectedComplaint.location.coordinates[1], selectedComplaint.location.coordinates[0]]}>
                                                <Popup>
                                                    <div style={{ textAlign: 'center', minWidth: '200px' }}>
                                                        <strong>{selectedComplaint.title}</strong>
                                                        <br />
                                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                                            {selectedComplaint.address || `${selectedComplaint.location.coordinates[1].toFixed(6)}, ${selectedComplaint.location.coordinates[0].toFixed(6)}`}
                                                        </span>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        </MapContainer>
                                    </div>
                                </div>
                            )}

                            {/* Status Update Section (for admins or complaint owner) */}
                            {canEdit && (
                                <div className="cd-status-management">
                                    <h3>Update Status</h3>
                                    <div className="cd-status-controls">
                                        {['pending', 'in-progress', 'resolved', 'rejected'].map((status) => (
                                            <button
                                                key={status}
                                                className={`cd-status-option-btn ${mapStatusToFrontend(selectedComplaint.status) === status ? 'cd-active-status' : ''}`}
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
                        complaintId={selectedComplaint._id}
                        complaintTitle={selectedComplaint.title}
                        complaintCategory={selectedComplaint.category}
                        complaintType={selectedComplaint.category}
                        isOpen={commentModalOpen}
                        comments={selectedComplaint.comments || []}
                        totalComments={selectedComplaint.commentCount || 0}
                        onClose={closeCommentModal}
                        onCommentSubmit={handleCommentSubmit}
                        onCommentUpdate={handleCommentUpdate}
                        onCommentDelete={handleCommentDelete}
                    />
                )}
            </div>
            <Footer />
            <Toaster 
                position="top-center"
                containerStyle={{
                    top: '120px', // Account for navbar
                }}
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        padding: '16px 20px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    },
                }}
            />
        </>
    );
}