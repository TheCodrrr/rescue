import { useTrendingComplaintsCache } from "./hooks/useTrendingComplaintsCache.jsx";
import { useInView } from "react-intersection-observer";
import { useSelector, useDispatch } from 'react-redux';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { upvoteComplaint, downvoteComplaint, addComment, fetchComments, updateComment, removeComment } from "./auth/redux/complaintSlice.js";
import { addComplaintVoteHistory, addCommentHistory } from "./auth/redux/historySlice.js";
import { toast } from 'react-hot-toast';
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import CommentModal from "./CommentModal.jsx";
import { 
  FiTrendingUp, 
  FiThumbsUp, 
  FiThumbsDown, 
  FiMessageCircle, 
  FiMapPin, 
  FiGlobe, 
  FiPhone,
  FiTool,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiLoader
} from 'react-icons/fi';
import { 
  MdTrendingUp,
  MdLocalFireDepartment,
  MdBalance,
  MdLocalHospital,
  MdWater,
  MdConstruction,
  MdWarning,
  MdElectricalServices,
  MdTrain
} from 'react-icons/md';
import "./Trending.css";

const Trending = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { complaints: reduxComplaints } = useSelector((state) => state.complaints);
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
    interactionsRemaining
  } = useTrendingComplaintsCache();
  
  // State for voting, comments, and modals
  const [votingInProgress, setVotingInProgress] = useState({});
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedComplaintForComments, setSelectedComplaintForComments] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [commentInProgress, setCommentInProgress] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  // Local state to track comment counts and comments for trending complaints
  const [localCommentData, setLocalCommentData] = useState({});
  // State to control animated loader visibility for demo purposes
  const [showAnimatedLoader, setShowAnimatedLoader] = useState(true);

  // Helper function to get comment count for a complaint
  const getCommentCount = (complaint) => {
    if (!complaint || !complaint._id) {
      return 0;
    }
    
    // First try local comment data
    const localData = localCommentData[complaint._id];
    if (localData) {
      return localData.count;
    }
    
    // Then try Redux store
    const reduxComplaint = reduxComplaints.find(c => 
      c._id === complaint._id || c.id === complaint._id
    );
    if (reduxComplaint?.comments?.length) {
      return reduxComplaint.comments.length;
    }
    
    // Then try original complaint data (might have commentsCount or comments array)
    if (complaint.commentsCount !== undefined) {
      return complaint.commentsCount;
    }
    if (complaint.comments?.length) {
      return complaint.comments.length;
    }
    if (complaint.commentCount !== undefined) {
      return complaint.commentCount;
    }
    
    return 0;
  };

  const shortenString = (str, lens) => {
    if (str.length > lens) return str.substring(0, lens) + "...";
    return str;
  }

  // Helper function to get comments for a complaint
  const getComments = (complaint) => {
    if (!complaint || !complaint._id) {
      return [];
    }
    
    // First try local comment data
    const localData = localCommentData[complaint._id];
    if (localData && localData.comments) {
      return localData.comments;
    }
    
    // Then try Redux store
    const reduxComplaint = reduxComplaints.find(c => 
      c._id === complaint._id || c.id === complaint._id
    );
    if (reduxComplaint?.comments) {
      return reduxComplaint.comments;
    }
    
    // Then try original complaint data
    if (complaint.comments) {
      return complaint.comments;
    }
    
    return [];
  };

  // Function to fetch comment count for a single complaint
  const fetchSingleCommentCount = async (complaintId) => {
    if (localCommentData[complaintId]) {
      return; // Already have data
    }
    
    try {
      const result = await dispatch(fetchComments(complaintId));
      if (fetchComments.fulfilled.match(result)) {
        const comments = result.payload.comments || [];
        setLocalCommentData(prev => ({
          ...prev,
          [complaintId]: {
            comments: comments,
            count: comments.length
          }
        }));
        console.log(`Fetched ${comments.length} comments for complaint ${complaintId}`);
      }
    } catch (error) {
      console.error(`Error fetching comments for complaint ${complaintId}:`, error);
    }
  };

  // Effect to fetch comment counts for visible complaints when data loads
  useEffect(() => {
    if (data && data.pages && data.pages.length > 0) {
      // Get the first few complaints that are likely to be visible
      const firstPageComplaints = data.pages[0].complaints || [];
      const visibleComplaints = firstPageComplaints.slice(0, 6); // First 6 complaints
      
      // Fetch comment counts for visible complaints with a delay to spread out requests
      visibleComplaints.forEach((complaint, index) => {
        if (!localCommentData[complaint._id]) {
          setTimeout(() => {
            fetchSingleCommentCount(complaint._id);
          }, index * 200); // 200ms delay between each request
        }
      });
    }
  }, [data?.pages?.length]); // Only trigger when new pages are loaded

  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  // Categories array for icons and colors
  const categories = [
    { value: 'rail', label: 'Rail Incidents', icon: <MdTrain />, color: '#f59e0b' },
    { value: 'road', label: 'Road Issues', icon: <MdConstruction />, color: '#db2777' },
    { value: 'fire', label: 'Fire Emergency', icon: <MdLocalFireDepartment />, color: '#ef4444' },
    { value: 'cyber', label: 'Cyber Crime', icon: <FiAlertTriangle />, color: '#8b5cf6' },
    { value: 'police', label: 'Police', icon: <FiAlertTriangle />, color: '#3b82f6' },
    { value: 'court', label: 'Court', icon: <MdBalance />, color: '#10b981' }
  ];

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (commentModalOpen) {
          closeCommentModal();
        }
      }
    };

    if (commentModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [commentModalOpen]);

  if (status === "pending") {
    return (
      <>
        <Navbar />
        <div className="trending-page">
          <div className="trending-container">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading trending complaints...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (status === "error") {
    console.error("Error in trending complaints:", error);
    return (
      <>
        <Navbar />
        <div className="trending-page">
          <div className="trending-container">
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Error Loading Complaints</h3>
              <p>{error?.message || "Failed to load trending complaints"}</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Defensive check for data and pages
  if (!data || !data.pages || data.pages.length === 0) {
    return (
      <>
        <Navbar />
        <div className="trending-page">
          <div className="trending-container">
            <div className="empty-state">
              <div className="empty-icon"><MdTrendingUp /></div>
              <h3>No Trending Complaints</h3>
              <p>No trending complaints found at the moment.</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  console.log("kem cho, this is the data: ", data);

  // Helper functions
  const getCategoryIcon = (category) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : '📝';
  };

  const getCategoryColor = (category) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.color : '#6b7280';
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'pending': 'status-pending',
      'in-progress': 'status-in-progress',
      'in_progress': 'status-in-progress',
      'resolved': 'status-resolved',
      'rejected': 'status-rejected'
    };
    return statusClasses[status] || 'status-pending';
  };

  const mapStatusToFrontend = (backendStatus) => {
    const statusMapping = {
      'pending': 'pending',
      'in_progress': 'in-progress',
      'resolved': 'resolved',
      'rejected': 'rejected'
    };
    return statusMapping[backendStatus] || backendStatus;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Severity helper function
  const getSeverityInfo = (severity) => {
    const severityMap = {
      'low': {
        label: 'Low',
        color: '#ffffff',
        bgColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      'medium': {
        label: 'Medium',
        color: '#1f2937',
        bgColor: 'rgba(245, 158, 11, 0.9)',
        borderColor: 'rgba(245, 158, 11, 1)',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      },
      'high': {
        label: 'High',
        color: '#ffffff',
        bgColor: 'rgba(239, 68, 68, 0.9)',
        borderColor: 'rgba(239, 68, 68, 1)',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    };
    
    return severityMap[severity] || {
      label: 'Unknown',
      color: '#ffffff',
      bgColor: 'rgba(107, 114, 128, 0.8)',
      borderColor: 'rgba(107, 114, 128, 1)',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
  };

  // Voting handlers
  const handleUpvote = async (complaintId) => {
    if (!isAuthenticated) {
      toast.error('🔐 Please log in to vote', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }
    
    setVotingInProgress(prev => ({ ...prev, [`${complaintId}-upvote`]: true }));
    
    try {
      const result = await dispatch(upvoteComplaint(complaintId));
      if (upvoteComplaint.fulfilled.match(result)) {
        console.log('Upvote result payload:', result.payload);
        
        // Record interaction for cache management
        recordInteraction();
        
        // Update React Query cache directly with the new vote counts
        queryClient.setQueryData(["trendingComplaints"], (oldData) => {
          if (!oldData) return oldData;
          
          const newData = {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              complaints: page.complaints.map(complaint => {
                if (complaint._id === complaintId) {
                  const updatedComplaint = {
                    ...complaint,
                    upvote: result.payload.upvotes,
                    downvote: result.payload.downvotes,
                    userVote: result.payload.userVote
                  };
                  console.log('Updating complaint cache:', {
                    id: complaintId,
                    oldUpvote: complaint.upvote,
                    newUpvote: result.payload.upvotes,
                    oldDownvote: complaint.downvote,
                    newDownvote: result.payload.downvotes
                  });
                  return updatedComplaint;
                }
                return complaint;
              })
            }))
          };
          
          return newData;
        });
        
        // Add history entry for upvote
        if (user) {
          // Find the complaint to get its category
          const complaint = data?.pages?.flatMap(page => page.complaints)?.find(c => c._id === complaintId);
          if (complaint) {
            dispatch(addComplaintVoteHistory({
              userId: user._id,
              complaintId: complaintId,
              category: complaint.category,
              voteType: 'upvote'
            }));
          }
        }
        
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
        toast.error('Failed to upvote. Please try again.', {
          duration: 3000,
          position: 'top-center',
          icon: <FiXCircle />,
        });
      }
    } catch (error) {
      toast.error('❌ Error while voting. Please try again.', {
        duration: 3000,
        position: 'top-center',
      });
    } finally {
      setVotingInProgress(prev => ({ ...prev, [`${complaintId}-upvote`]: false }));
    }
  };

  const handleDownvote = async (complaintId) => {
    if (!isAuthenticated) {
      toast.error('🔐 Please log in to vote', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }
    
    setVotingInProgress(prev => ({ ...prev, [`${complaintId}-downvote`]: true }));
    
    try {
      const result = await dispatch(downvoteComplaint(complaintId));
      if (downvoteComplaint.fulfilled.match(result)) {
        console.log('Downvote result payload:', result.payload);
        
        // Record interaction for cache management
        recordInteraction();
        
        // Update React Query cache directly with the new vote counts
        queryClient.setQueryData(["trendingComplaints"], (oldData) => {
          if (!oldData) return oldData;
          
          const newData = {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              complaints: page.complaints.map(complaint => {
                if (complaint._id === complaintId) {
                  const updatedComplaint = {
                    ...complaint,
                    upvote: result.payload.upvotes,
                    downvote: result.payload.downvotes,
                    userVote: result.payload.userVote
                  };
                  console.log('Updating complaint cache (downvote):', {
                    id: complaintId,
                    oldUpvote: complaint.upvote,
                    newUpvote: result.payload.upvotes,
                    oldDownvote: complaint.downvote,
                    newDownvote: result.payload.downvotes
                  });
                  return updatedComplaint;
                }
                return complaint;
              })
            }))
          };
          
          return newData;
        });
        
        // Add history entry for downvote
        if (user) {
          // Find the complaint to get its category
          const complaint = data?.pages?.flatMap(page => page.complaints)?.find(c => c._id === complaintId);
          if (complaint) {
            dispatch(addComplaintVoteHistory({
              userId: user._id,
              complaintId: complaintId,
              category: complaint.category,
              voteType: 'downvote'
            }));
          }
        }
        
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
      setVotingInProgress(prev => ({ ...prev, [`${complaintId}-downvote`]: false }));
    }
  };

  // Comment modal handlers
  const openCommentModal = async (complaint) => {
    const currentScrollY = window.scrollY;
    setScrollPosition(currentScrollY);
    
    setSelectedComplaintForComments(complaint);
    setCommentModalOpen(true);
    setNewComment('');
    setCommentRating(5);
    setCommentsLoading(true);
    
    try {
      const result = await dispatch(fetchComments(complaint._id));
      if (fetchComments.fulfilled.match(result)) {
        // Store the fetched comments locally for this complaint
        setLocalCommentData(prev => ({
          ...prev,
          [complaint._id]: {
            comments: result.payload.comments || [],
            count: (result.payload.comments || []).length
          }
        }));
        
        // Update the selected complaint with the fetched comments
        setSelectedComplaintForComments(prevComplaint => ({
          ...prevComplaint,
          comments: result.payload.comments || []
        }));
        
        console.log('Fetched comments for complaint:', complaint._id, result.payload.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
    
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${currentScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  };

  const closeCommentModal = () => {
    setCommentModalOpen(false);
    setSelectedComplaintForComments(null);
    setNewComment('');
    setCommentRating(5);
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    
    window.scrollTo(0, scrollPosition);
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    if (!isAuthenticated) {
      toast.error('🔐 Please log in to comment', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    setCommentInProgress(true);
    
    try {
      const result = await dispatch(addComment({
        complaintId: selectedComplaintForComments._id,
        content: newComment.trim(),
        rating: commentRating
      }));

      if (addComment.fulfilled.match(result)) {
        // Record interaction for cache management
        recordInteraction();
        
        // Add history entry for comment added
        if (user && selectedComplaintForComments) {
          dispatch(addCommentHistory({
            userId: user._id,
            complaintId: selectedComplaintForComments._id,
            commentId: result.payload?.comment?._id || 'unknown',
            commentText: newComment.trim(),
            category: selectedComplaintForComments.category,
            actionType: 'COMMENT_ADDED'
          }));
        }
        
        setNewComment('');
        setCommentRating(5);
        
        // Fetch updated comments for the modal
        const fetchResult = await dispatch(fetchComments(selectedComplaintForComments._id));
        
        if (fetchComments.fulfilled.match(fetchResult)) {
          // Update both local comment data and selected complaint
          const newComments = fetchResult.payload.comments || [];
          setLocalCommentData(prev => ({
            ...prev,
            [selectedComplaintForComments._id]: {
              comments: newComments,
              count: newComments.length
            }
          }));
          
          const updatedComplaint = {
            ...selectedComplaintForComments,
            comments: newComments
          };
          setSelectedComplaintForComments(updatedComplaint);
          
          console.log('Updated local comment data after adding comment:', newComments);
        }
        
        toast.success('Comment added successfully!', {
          duration: 3000,
          position: 'top-center',
          icon: <FiMessageCircle />,
        });
      } else {
        const errorMessage = result.payload || 'Failed to add comment';
        toast.error(`❌ ${errorMessage}`, {
          duration: 3000,
          position: 'top-center',
        });
      }

    } catch (error) {
      toast.error('❌ Failed to add comment. Please try again.', {
        duration: 3000,
        position: 'top-center',
      });
    } finally {
      setCommentInProgress(false);
    }
  };

  const handleCommentUpdate = async (commentId, updateData) => {
    try {
      const result = await dispatch(updateComment({
        commentId,
        ...updateData
      }));

      if (updateComment.fulfilled.match(result)) {
        // Add history entry for comment edited
        if (user && selectedComplaintForComments) {
          dispatch(addCommentHistory({
            userId: user._id,
            complaintId: selectedComplaintForComments._id,
            commentId: commentId,
            commentText: updateData.comment,
            category: selectedComplaintForComments.category,
            actionType: 'COMMENT_EDITED',
            previousText: 'Previous comment text' // Would need original text here
          }));
        }
        
        // Fetch updated comments
        const fetchResult = await dispatch(fetchComments(selectedComplaintForComments._id));
        
        if (fetchComments.fulfilled.match(fetchResult)) {
          const newComments = fetchResult.payload.comments || [];
          setLocalCommentData(prev => ({
            ...prev,
            [selectedComplaintForComments._id]: {
              comments: newComments,
              count: newComments.length
            }
          }));
          
          // Update the selected complaint with the new comments
          setSelectedComplaintForComments(prevComplaint => ({
            ...prevComplaint,
            comments: newComments
          }));
        }
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
        // Add history entry for comment deleted
        if (user && selectedComplaintForComments) {
          dispatch(addCommentHistory({
            userId: user._id,
            complaintId: selectedComplaintForComments._id,
            commentId: commentId,
            commentText: 'Deleted comment text', // Would need original text here
            category: selectedComplaintForComments.category,
            actionType: 'COMMENT_DELETED'
          }));
        }
        
        // Fetch updated comments
        const fetchResult = await dispatch(fetchComments(selectedComplaintForComments._id));
        
        if (fetchComments.fulfilled.match(fetchResult)) {
          const newComments = fetchResult.payload.comments || [];
          setLocalCommentData(prev => ({
            ...prev,
            [selectedComplaintForComments._id]: {
              comments: newComments,
              count: newComments.length
            }
          }));
          
          // Update the selected complaint with the new comments
          setSelectedComplaintForComments(prevComplaint => ({
            ...prevComplaint,
            comments: newComments
          }));
        }
      } else {
        throw new Error(result.payload || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };

  const handleModalCommentSubmit = async (commentData) => {
    try {
      console.log('Received commentData in handleModalCommentSubmit:', commentData);
      
      // CommentModal sends 'content' not 'comment'
      const commentText = commentData.content || commentData.comment;
      
      // Validate comment data
      if (!commentText || !commentText.trim()) {
        toast.error('Please enter a comment', {
          duration: 3000,
          position: 'top-center',
        });
        throw new Error('Comment text is required');
      }
      
      // Record interaction for cache management
      recordInteraction();
      
      const result = await dispatch(addComment({
        complaintId: commentData.complaintId,
        content: commentText.trim(),
        rating: commentData.rating || 5
      }));

      if (addComment.fulfilled.match(result)) {
        // Add history entry for comment added
        if (user && selectedComplaintForComments) {
          dispatch(addCommentHistory({
            userId: user._id,
            complaintId: selectedComplaintForComments._id,
            commentId: result.payload?.comment?._id || 'unknown',
            commentText: commentData.comment,
            category: selectedComplaintForComments.category,
            actionType: 'COMMENT_ADDED'
          }));
        }
        
        // Fetch updated comments for the modal
        const fetchResult = await dispatch(fetchComments(selectedComplaintForComments._id));
        
        if (fetchComments.fulfilled.match(fetchResult)) {
          const newComments = fetchResult.payload.comments || [];
          setLocalCommentData(prev => ({
            ...prev,
            [selectedComplaintForComments._id]: {
              comments: newComments,
              count: newComments.length
            }
          }));
          
          // Update the selected complaint with the new comments
          setSelectedComplaintForComments(prevComplaint => ({
            ...prevComplaint,
            comments: newComments
          }));
          
          console.log('Comment added successfully, updated comment count:', newComments.length);
        }
        
        toast.success('Comment added successfully!', {
          duration: 3000,
          position: 'top-center',
          icon: <FiMessageCircle />,
          style: {
            background: 'rgba(16, 185, 129, 0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#fff',
            fontWeight: '600',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          },
        });
      } else {
        throw new Error(result.payload || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('❌ Failed to add comment. Please try again.', {
        duration: 3000,
        position: 'top-center',
      });
      throw error;
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span 
        key={i} 
        className={`star ${i < rating ? 'filled' : ''}`}
        onClick={() => setCommentRating(i + 1)}
      >
        ★
      </span>
    ));
  };

  return (
    <>
      <Navbar />
      <div className="trending-page">
        <div className="trending-container">
          <div className="trending-header">
            <h1 className="trending-title">
              <span className="trending-icon"><MdTrendingUp /></span>
              Trending Complaints
            </h1>
            <p className="trending-subtitle">
              Discover the most discussed and voted complaints in your community
            </p>
          </div>

          <div className="trending-complaints-grid">
            {data.pages.map((page, pageIndex) =>
              page.complaints?.map((complaint, index) => (
                <div key={complaint._id || `${pageIndex}-${index}`} className="trending-card">
                  {/* Card Header - Category with status + User info on right */}
                  <div className="trending-card-header">
                    <div className="trending-category-with-status">
                      <span 
                        className="trending-category-icon"
                        style={{ color: getCategoryColor(complaint.category) }}
                      >
                        {getCategoryIcon(complaint.category)}
                      </span>
                      <span className="trending-category-name">
                        {categories.find(cat => cat.value === complaint.category)?.label || complaint.category}
                      </span>
                      {complaint.status && (
                        <div className="trending-status-mini">
                          <span 
                            className={`trending-status-dot ${getStatusBadgeClass(complaint.status)}`}
                            title={`Status: ${mapStatusToFrontend(complaint.status).replace('-', ' ')}`}
                          ></span>
                        </div>
                      )}
                    </div>
                    
                    {/* Hoverable User Info - Right aligned */}
                    {complaint.user_id && (
                      <div className="trending-user-hover-container">
                        <div className="trending-user-avatar-hover">
                          {complaint.user_id.profileImage ? (
                            <img 
                              src={complaint.user_id.profileImage} 
                              alt={complaint.user_id.name || 'User'} 
                              className="trending-avatar-image-hover"
                            />
                          ) : (
                            <div className="trending-avatar-placeholder-hover">
                              {(complaint.user_id.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="trending-user-name-expandable">
                          {complaint.user_id.name || 'Anonymous'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Content Area */}
                  <div className="trending-card-content">
                    {/* Title and Severity Row */}
                    <div className="trending-title-row">
                      <h4 className="trending-complaint-title">
                        {shortenString(complaint?.title || "", 15)}
                      </h4>
                      {complaint.severity && (
                        <div 
                          className="trending-severity-indicator"
                          title="Severity"
                          style={{
                            color: getSeverityInfo(complaint.severity).color,
                            backgroundColor: getSeverityInfo(complaint.severity).bgColor,
                            borderColor: getSeverityInfo(complaint.severity).borderColor
                          }}
                        >
                          <span className="trending-severity-icon">
                            {getSeverityInfo(complaint.severity).icon}
                          </span>
                          <span className="trending-severity-label">
                            {getSeverityInfo(complaint.severity).label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="trending-complaint-description">
                      {shortenString(complaint?.description || "", 130)}
                    </p>

                    {/* Address - Left aligned */}
                    {complaint.address && (
                      <div className="trending-address-display">
                        <FiMapPin className="trending-address-icon" />
                        <span className="trending-address-text">{complaint.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Actions and Stats */}
                  <div className="trending-card-footer">
                    {/* Engagement Actions */}
                    <div className="trending-actions">
                      <button 
                        className={`trending-action-btn trending-upvote ${votingInProgress[`${complaint._id}-upvote`] ? 'loading' : ''}`}
                        onClick={() => handleUpvote(complaint._id)}
                        disabled={votingInProgress[`${complaint._id}-upvote`] || votingInProgress[`${complaint._id}-downvote`]}
                        title="Upvote"
                      >
                        {votingInProgress[`${complaint._id}-upvote`] ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <FiThumbsUp className="action-icon" />
                        )}
                        <span className="action-count">{complaint.upvote || 0}</span>
                      </button>
                      
                      <button 
                        className={`trending-action-btn trending-downvote ${votingInProgress[`${complaint._id}-downvote`] ? 'loading' : ''}`}
                        onClick={() => handleDownvote(complaint._id)}
                        disabled={votingInProgress[`${complaint._id}-upvote`] || votingInProgress[`${complaint._id}-downvote`]}
                        title="Downvote"
                      >
                        {votingInProgress[`${complaint._id}-downvote`] ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <FiThumbsDown className="action-icon" />
                        )}
                        <span className="action-count">{complaint.downvote || 0}</span>
                      </button>

                      <button 
                        className="trending-action-btn trending-comment"
                        onClick={() => openCommentModal(complaint)}
                        title="View Comments"
                      >
                        <FiMessageCircle className="action-icon" />
                        <span className="action-count">{getCommentCount(complaint)}</span>
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="trending-meta-info">
                      <div className="trending-score-display">
                        <MdLocalFireDepartment className="trending-fire-icon" />
                        <span className="trending-score-value">{complaint.score?.toFixed(1) || '0.0'}</span>
                      </div>
                      <div className="trending-date-display">
                        <span className="trending-date-text">{formatDate(complaint.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div ref={ref} className="load-more-section">
            {isFetchingNextPage ? (
              <div className="loading-more">
                <div className="animated-loader">
                  <div className="animated-circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                  </div>
                  <div className="animated-circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                  </div>
                  <div className="animated-circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                  </div>
                  <div className="animated-circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                  </div>
                </div>
                <span>Loading more complaints...</span>
              </div>
            ) : hasNextPage ? (
              <div className="scroll-indicator">
                <span>Scroll to load more</span>
                <svg className="scroll-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            ) : (
              <div className="end-message">
                <span>🎉 You've reached the end! No more complaints to show.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        complaintId={selectedComplaintForComments?._id}
        complaintTitle={selectedComplaintForComments?.title}
        complaintCategory={categories.find(cat => cat.value === selectedComplaintForComments?.category)?.label || selectedComplaintForComments?.category}
        complaintType={selectedComplaintForComments?.type}
        isOpen={commentModalOpen}
        onClose={closeCommentModal}
        onCommentSubmit={handleModalCommentSubmit}
        onCommentUpdate={handleCommentUpdate}
        onCommentDelete={handleCommentDelete}
        comments={selectedComplaintForComments?.comments || []}
        totalComments={selectedComplaintForComments?.comments?.length || 0}
      />

      <Footer />
    </>
  );
};

export default Trending;
