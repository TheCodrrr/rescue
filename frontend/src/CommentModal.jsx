import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import './CommentModal.css';

const CommentModal = ({ 
    complaintId, 
    complaintTitle, 
    complaintCategory, 
    complaintType,
    isOpen, 
    onClose, 
    onCommentSubmit, 
    onCommentUpdate, 
    onCommentDelete, 
    comments,
    totalComments
}) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    
    const [newComment, setNewComment] = useState('');
    const [commentRating, setCommentRating] = useState(0);
    const [commentInProgress, setCommentInProgress] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editedCommentText, setEditedCommentText] = useState('');
    const [editedCommentRating, setEditedCommentRating] = useState(0);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setNewComment('');
            setCommentRating(0);
            setEditingCommentId(null);
            setEditedCommentText('');
            setEditedCommentRating(0);
        }
    }, [isOpen]);

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    className={`star ${i <= rating ? 'filled' : ''}`}
                >
                    ★
                </span>
            );
        }
        return stars;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Just now';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const handleCommentSubmit = async () => {
        if (!newComment.trim()) {
            toast.error('Please write a comment');
            return;
        }

        if (!user) {
            toast.error('Please login to comment');
            return;
        }

        setCommentInProgress(true);
        try {
            const commentData = {
                complaintId,
                comment: newComment.trim(),
                rating: commentRating || undefined
            };

            await onCommentSubmit(commentData);
            
            // Reset form
            setNewComment('');
            setCommentRating(0);
            
            toast.success('Comment added successfully!');
        } catch (error) {
            console.error('Error submitting comment:', error);
            toast.error(error.message || 'Failed to add comment');
        } finally {
            setCommentInProgress(false);
        }
    };

    const handleEditComment = (comment) => {
        setEditingCommentId(comment._id);
        setEditedCommentText(comment.comment || comment.content || '');
        setEditedCommentRating(comment.rating || 0);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditedCommentText('');
        setEditedCommentRating(0);
    };

    const handleSaveEdit = async (commentId) => {
        if (!editedCommentText.trim()) {
            toast.error('Comment cannot be empty');
            return;
        }

        try {
            const updateData = {
                comment: editedCommentText.trim(),
                rating: editedCommentRating || undefined
            };

            await onCommentUpdate(commentId, updateData);
            
            setEditingCommentId(null);
            setEditedCommentText('');
            setEditedCommentRating(0);
            
            toast.success('Comment updated successfully!');
        } catch (error) {
            console.error('Error updating comment:', error);
            toast.error(error.message || 'Failed to update comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await onCommentDelete(commentId);
            toast.success('Comment deleted successfully!');
        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error(error.message || 'Failed to delete comment');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="comment-modal-overlay" onClick={onClose}>
            <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-content">
                        <div className="complaint-info-inline">
                            <h3 className="complaint-title-modal">{complaintTitle}</h3>
                            {complaintCategory && (
                                <span className="complaint-category-badge">
                                    {complaintCategory}
                                </span>
                            )}
                        </div>
                    </div>
                    <button 
                        className="close-modal-btn" 
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="comment-modal-content">
                    <div className="comments-section">
                        <h4 className="comments-section-title">
                            Comments ({totalComments || comments?.length || 0})
                        </h4>
                        
                        <div className="comments-list">
                            {comments && comments.length > 0 ? (
                                comments.map((comment) => {
                                    // Debug: log comment structure
                                    console.log('Comment structure:', comment);
                                    console.log('User info:', comment.user);
                                    console.log('User_id info:', comment.user_id);
                                    
                                    const isEditing = editingCommentId === comment._id;
                                    const isOwner = user && (
                                        comment.userId === user._id || 
                                        comment.user?._id === user._id || 
                                        comment.user_id?._id === user._id ||
                                        comment.user_id?.id === user._id ||
                                        comment.user?.id === user._id
                                    );
                                    
                                    return (
                                        <div key={comment._id} className="comment-item">
                                            <div className="comment-header">
                                                <div className="comment-author">
                                                    {(comment.user?.profileImage || comment.user_id?.profileImage) ? (
                                                        <img
                                                            src={comment.user?.profileImage || comment.user_id?.profileImage}
                                                            alt="Profile"
                                                            className="user-profile-image"
                                                        />
                                                    ) : (
                                                        <svg className="user-icon" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                        </svg>
                                                    )}
                                                    <div>
                                                        <span className="author-name">
                                                            {comment.user?.username || 
                                                             comment.user?.name || 
                                                             comment.user_id?.username || 
                                                             comment.user_id?.name || 
                                                             comment.username || 
                                                             comment.author || 
                                                             'Anonymous'}
                                                        </span>
                                                        <div className="comment-date">
                                                            {formatDate(comment.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isOwner && (
                                                    <div className="comment-actions">
                                                        <div className="comment-action-buttons">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        className="comment-action-btn save-btn"
                                                                        onClick={() => handleSaveEdit(comment._id)}
                                                                        title="Save changes"
                                                                    >
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="comment-action-btn cancel-btn"
                                                                        onClick={handleCancelEdit}
                                                                        title="Cancel editing"
                                                                    >
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        className="comment-action-btn edit-btn"
                                                                        onClick={() => handleEditComment(comment)}
                                                                        title="Edit comment"
                                                                    >
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="comment-action-btn delete-btn"
                                                                        onClick={() => handleDeleteComment(comment._id)}
                                                                        title="Delete comment"
                                                                    >
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="comment-body">
                                                <div className="comment-content">
                                                    {isEditing ? (
                                                        <textarea
                                                            className="edit-comment-input"
                                                            value={editedCommentText}
                                                            onChange={(e) => setEditedCommentText(e.target.value)}
                                                            placeholder="Edit your comment..."
                                                            maxLength={500}
                                                        />
                                                    ) : (
                                                        comment.comment || comment.content
                                                    )}
                                                </div>
                                                {comment.rating && (
                                                    <div className="comment-rating">
                                                        {isEditing ? (
                                                            <div className="edit-rating">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span
                                                                        key={star}
                                                                        className={`star editable ${star <= editedCommentRating ? 'filled' : ''}`}
                                                                        onClick={() => setEditedCommentRating(star)}
                                                                    >
                                                                        ★
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            renderStars(comment.rating)
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="no-comments">
                                    <svg className="no-comments-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                                    </svg>
                                    <p>No comments yet. Be the first to comment!</p>
                                </div>
                            )}
                        </div>

                        <div className="add-comment-section">
                            <div className="comment-input-container">
                                <div className="input-with-rating">
                                    <div className="comment-input-wrapper">
                                        <textarea
                                            className="comment-input"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Write a comment..."
                                            rows={3}
                                            maxLength={500}
                                        />
                                        <span className="character-count-overlay">
                                            {newComment.length}/500
                                        </span>
                                    </div>
                                    <div className="rating-section-inline">
                                        <div className="rating-left">
                                            <label className="rating-label">Rate:</label>
                                            <div className="star-rating">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span
                                                        key={star}
                                                        className={`star ${star <= commentRating ? 'filled' : ''}`}
                                                        onClick={() => setCommentRating(star)}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            className="submit-comment-btn-rating"
                                            onClick={handleCommentSubmit}
                                            disabled={commentInProgress || !newComment.trim()}
                                        >
                                            {commentInProgress ? (
                                                <>
                                                    <div className="comment-spinner-small"></div>
                                                    <span>Posting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="send-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    <span>Comment</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentModal;
