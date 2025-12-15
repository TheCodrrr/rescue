import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import BottomNavigation from '../components/BottomNavigation';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  Complaint,
  downvoteComplaint,
  fetchTrendingComplaints,
  resetTrendingComplaints,
  upvoteComplaint,
} from '../store/slices/complaintSlice';

// Categories matching the website
const categories = [
  { value: 'rail', label: 'Rail Incidents', icon: 'train', color: '#f59e0b' },
  { value: 'road', label: 'Road Issues', icon: 'car', color: '#db2777' },
  { value: 'fire', label: 'Fire Emergency', icon: 'flame', color: '#ef4444' },
  { value: 'cyber', label: 'Cyber Crime', icon: 'warning', color: '#8b5cf6' },
  { value: 'police', label: 'Police', icon: 'shield', color: '#3b82f6' },
  { value: 'court', label: 'Court', icon: 'business', color: '#10b981' },
];

// Status colors
const getStatusInfo = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return { label: 'PENDING', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' };
    case 'in-progress':
    case 'in_progress':
      return { label: 'IN PROGRESS', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' };
    case 'resolved':
      return { label: 'RESOLVED', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' };
    case 'rejected':
      return { label: 'REJECTED', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    default:
      return { label: 'PENDING', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' };
  }
};

// Severity info
const getSeverityInfo = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'low':
      return { label: 'Low', emoji: '🟢', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' };
    case 'medium':
      return { label: 'Medium', emoji: '🟡', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
    case 'high':
      return { label: 'High', emoji: '🔴', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    default:
      return { label: 'Medium', emoji: '🟡', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
  }
};

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};

// Get category icon
const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  const cat = categories.find((c) => c.value === category);
  return (cat?.icon as keyof typeof Ionicons.glyphMap) || 'alert-circle';
};

// Get category color
const getCategoryColor = (category: string) => {
  const cat = categories.find((c) => c.value === category);
  return cat?.color || '#6b7280';
};

// Get category label
const getCategoryLabel = (category: string) => {
  const cat = categories.find((c) => c.value === category);
  return cat?.label || category;
};

// Shorten string helper
const shortenString = (str: string, maxLen: number) => {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '...';
};

// Comment interface
interface CommentData {
  _id: string;
  user_id: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  comment: string;
  rating: number;
  createdAt: string;
}

export default function TrendingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  const isLoadingMoreRef = useRef(false); // Ref to track if a load is already in progress

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const {
    trendingComplaints,
    isFetchingTrending,
    isFetchingMoreTrending,
    trendingNextCursor,
    trendingHasNextPage,
    isVoting,
    error,
  } = useAppSelector((state) => state.complaints);

  const [refreshing, setRefreshing] = useState(false);
  
  // Comment Modal State
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<(Complaint & { score?: number }) | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Local comment counts to update UI after adding comment
  const [localCommentCounts, setLocalCommentCounts] = useState<{ [key: string]: number }>({});

  // Fetch trending complaints on mount
  useEffect(() => {
    dispatch(resetTrendingComplaints());
    dispatch(fetchTrendingComplaints({ limit: 10 }));
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(resetTrendingComplaints());
    setLocalCommentCounts({});
    await dispatch(fetchTrendingComplaints({ limit: 10 }));
    setRefreshing(false);
  }, [dispatch]);

  // Load more complaints - called when user scrolls near bottom
  const loadMore = useCallback(() => {
    // Prevent multiple simultaneous loads using ref
    if (isLoadingMoreRef.current) return;
    
    if (trendingHasNextPage && !isFetchingMoreTrending && !isFetchingTrending && trendingNextCursor) {
      isLoadingMoreRef.current = true;
      console.log('Loading more trending complaints...');
      dispatch(fetchTrendingComplaints({ cursor: trendingNextCursor, limit: 10 }))
        .finally(() => {
          isLoadingMoreRef.current = false;
        });
    }
  }, [trendingHasNextPage, isFetchingMoreTrending, isFetchingTrending, trendingNextCursor, dispatch]);

  // Handle scroll to detect when to load more
  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      // Trigger loading when user has scrolled ~60% of the content (load earlier for smoother experience)
      const scrollPercentage = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
      
      if (scrollPercentage >= 0.6) {
        loadMore();
      }
    },
    [loadMore]
  );

  // Handle upvote
  const handleUpvote = useCallback(
    (complaintId: string) => {
      if (!isAuthenticated) {
        Alert.alert(
          'Login Required',
          'Please login to vote on complaints.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => router.push('/login') },
          ]
        );
        return;
      }
      if (isVoting[complaintId]) return;
      dispatch(upvoteComplaint(complaintId));
    },
    [isVoting, isAuthenticated, dispatch, router]
  );

  // Handle downvote
  const handleDownvote = useCallback(
    (complaintId: string) => {
      if (!isAuthenticated) {
        Alert.alert(
          'Login Required',
          'Please login to vote on complaints.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => router.push('/login') },
          ]
        );
        return;
      }
      if (isVoting[complaintId]) return;
      dispatch(downvoteComplaint(complaintId));
    },
    [isVoting, isAuthenticated, dispatch, router]
  );

  // Fetch comments for a complaint
  const fetchComments = useCallback(async (complaintId: string) => {
    setCommentsLoading(true);
    try {
      const response = await axiosInstance.get(`/feedback/${complaintId}`);
      const fetchedComments = response.data.data || response.data.feedbacks || [];
      setComments(fetchedComments);
      // Update local comment count
      setLocalCommentCounts(prev => ({
        ...prev,
        [complaintId]: fetchedComments.length
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  // Open comment modal (matching website behavior - clicking card opens modal)
  const openCommentModal = useCallback(async (complaint: Complaint & { score?: number }) => {
    setSelectedComplaint(complaint);
    setCommentModalOpen(true);
    setNewComment('');
    setCommentRating(5);
    await fetchComments(complaint._id);
  }, [fetchComments]);

  // Close comment modal
  const closeCommentModal = useCallback(() => {
    setCommentModalOpen(false);
    setSelectedComplaint(null);
    setComments([]);
    setNewComment('');
    setCommentRating(5);
  }, []);

  // Submit new comment
  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to comment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => {
            closeCommentModal();
            router.push('/login');
          }},
        ]
      );
      return;
    }

    if (!selectedComplaint) return;

    setSubmittingComment(true);
    try {
      await axiosInstance.post('/feedback/add', {
        complaint_id: selectedComplaint._id,
        comment: newComment.trim(),
        rating: commentRating,
      });
      
      // Refresh comments
      await fetchComments(selectedComplaint._id);
      setNewComment('');
      setCommentRating(5);
      
      Alert.alert('Success', 'Comment added successfully!');
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }, [newComment, commentRating, selectedComplaint, isAuthenticated, fetchComments, closeCommentModal, router]);

  // Get comment count for a complaint
  const getCommentCount = useCallback((complaint: Complaint) => {
    // First check local counts (updated after adding comment)
    if (localCommentCounts[complaint._id] !== undefined) {
      return localCommentCounts[complaint._id];
    }
    // Then check complaint's comments array
    return complaint.comments?.length || 0;
  }, [localCommentCounts]);

  // Render star rating
  const renderStars = (rating: number, interactive: boolean = false, onSelect?: (rating: number) => void) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && onSelect?.(star)}
            disabled={!interactive}
            className="mr-1"
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={interactive ? 24 : 14}
              color={star <= rating ? '#f59e0b' : '#6b7280'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render comment item
  const renderCommentItem = (comment: CommentData) => (
    <View
      key={comment._id}
      className="bg-[#222831] rounded-xl p-4 mb-3"
      style={{ borderWidth: 1, borderColor: 'rgba(0, 173, 181, 0.1)' }}
    >
      <View className="flex-row items-start">
        {/* User Avatar */}
        {comment.user_id?.profileImage ? (
          <Image
            source={{ uri: comment.user_id.profileImage }}
            className="w-10 h-10 rounded-full mr-3"
          />
        ) : (
          <View className="w-10 h-10 rounded-full bg-[#00ADB5]/20 items-center justify-center mr-3">
            <Text className="text-[#00ADB5] font-bold">
              {(comment.user_id?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white font-semibold text-sm">
              {comment.user_id?.name || 'Anonymous'}
            </Text>
            <Text className="text-[#EEEEEE]/50 text-xs">
              {formatDate(comment.createdAt)}
            </Text>
          </View>
          
          {/* Rating */}
          {comment.rating > 0 && (
            <View className="mb-2">
              {renderStars(comment.rating)}
            </View>
          )}
          
          {/* Comment Text */}
          <Text className="text-[#EEEEEE]/80 text-sm">
            {comment.comment}
          </Text>
        </View>
      </View>
    </View>
  );

  // Render complaint card
  const renderComplaintCard = (complaint: Complaint & { score?: number }, index: number) => {
    const statusInfo = getStatusInfo(complaint.status);
    const severityInfo = getSeverityInfo(complaint.severity);
    const categoryColor = getCategoryColor(complaint.category);

    return (
      <View
        key={`trending-${complaint._id}-${index}`}
        className="bg-[#393E46] rounded-2xl mb-4 overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: 'rgba(0, 173, 181, 0.2)',
        }}
      >
        {/* Card Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#222831]">
          <View className="flex-row items-center flex-1">
            {/* Category Icon & Label */}
            <View
              style={{ backgroundColor: `${categoryColor}20` }}
              className="p-2 rounded-lg mr-2"
            >
              <Ionicons name={getCategoryIcon(complaint.category)} size={18} color={categoryColor} />
            </View>
            <Text style={{ color: categoryColor }} className="text-sm font-medium" numberOfLines={1}>
              {getCategoryLabel(complaint.category)}
            </Text>
            
            {/* Status Dot */}
            <View
              style={{ backgroundColor: statusInfo.color }}
              className="w-2 h-2 rounded-full ml-2"
            />
          </View>

          {/* User Avatar */}
          {complaint.user_id && (
            <View className="flex-row items-center">
              {complaint.user_id.profileImage ? (
                <Image
                  source={{ uri: complaint.user_id.profileImage }}
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: 'rgba(0, 173, 181, 0.2)' }}
                />
              ) : (
                <View className="w-8 h-8 rounded-full bg-[#00ADB5]/20 items-center justify-center">
                  <Text className="text-[#00ADB5] font-bold text-sm">
                    {(complaint.user_id.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Card Body */}
        <View className="px-4 py-3">
          {/* Title and Severity */}
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-white text-base font-semibold flex-1 mr-2" numberOfLines={2}>
              {shortenString(complaint.title, 50)}
            </Text>
            
            {complaint.severity && (
              <View
                style={{ backgroundColor: severityInfo.bgColor }}
                className="flex-row items-center px-2 py-1 rounded-full"
              >
                <Text className="mr-1 text-xs">{severityInfo.emoji}</Text>
                <Text style={{ color: severityInfo.color }} className="text-xs font-medium">
                  {severityInfo.label}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text className="text-[#EEEEEE]/70 text-sm mb-3" numberOfLines={3}>
            {shortenString(complaint.description, 130)}
          </Text>

          {/* Address */}
          {complaint.address && (
            <View className="flex-row items-center mb-1">
              <Ionicons name="location-outline" size={14} color="#00ADB5" />
              <Text className="text-[#EEEEEE]/60 text-xs ml-1 flex-1" numberOfLines={1}>
                {complaint.address}
              </Text>
            </View>
          )}
        </View>

        {/* Card Footer */}
        <View className="px-4 py-3 border-t border-[#222831]">
          <View className="flex-row items-center justify-between">
            {/* Engagement Actions */}
            <View className="flex-row items-center">
              {/* Upvote */}
              <TouchableOpacity
                onPress={() => handleUpvote(complaint._id)}
                disabled={isVoting[complaint._id]}
                style={{
                  backgroundColor: complaint.userVote === 'upvote' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                }}
                className="flex-row items-center mr-3 px-3 py-1.5 rounded-lg"
              >
                {isVoting[complaint._id] ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Ionicons
                    name={complaint.userVote === 'upvote' ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={18}
                    color={complaint.userVote === 'upvote' ? '#10b981' : '#EEEEEE80'}
                  />
                )}
                <Text
                  style={{ color: complaint.userVote === 'upvote' ? '#10b981' : 'rgba(238, 238, 238, 0.6)' }}
                  className="ml-1.5 text-sm font-medium"
                >
                  {complaint.upvote || 0}
                </Text>
              </TouchableOpacity>

              {/* Downvote */}
              <TouchableOpacity
                onPress={() => handleDownvote(complaint._id)}
                disabled={isVoting[complaint._id]}
                style={{
                  backgroundColor: complaint.userVote === 'downvote' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                }}
                className="flex-row items-center mr-3 px-3 py-1.5 rounded-lg"
              >
                {isVoting[complaint._id] ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons
                    name={complaint.userVote === 'downvote' ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={18}
                    color={complaint.userVote === 'downvote' ? '#ef4444' : '#EEEEEE80'}
                  />
                )}
                <Text
                  style={{ color: complaint.userVote === 'downvote' ? '#ef4444' : 'rgba(238, 238, 238, 0.6)' }}
                  className="ml-1.5 text-sm font-medium"
                >
                  {complaint.downvote || 0}
                </Text>
              </TouchableOpacity>

              {/* Comments - Opens modal */}
              <TouchableOpacity
                onPress={() => openCommentModal(complaint)}
                className="flex-row items-center px-2 py-1.5"
              >
                <Ionicons name="chatbubble-outline" size={18} color="#EEEEEE80" />
                <Text className="text-[#EEEEEE]/60 ml-1.5 text-sm">
                  {getCommentCount(complaint)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Meta Info */}
            <View className="flex-row items-center">
              {/* Trending Score */}
              {complaint.score !== undefined && (
                <View className="flex-row items-center mr-3">
                  <Ionicons name="flame" size={14} color="#ef4444" />
                  <Text className="text-[#ef4444] ml-1 text-xs font-medium">
                    {complaint.score?.toFixed(1) || '0.0'}
                  </Text>
                </View>
              )}
              
              {/* Date */}
              <Text className="text-[#EEEEEE]/50 text-xs">
                {formatDate(complaint.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render loading state
  const renderLoading = () => (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator size="large" color="#00ADB5" />
      <Text className="text-[#EEEEEE]/60 mt-4">Loading trending complaints...</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View className="flex-1 items-center justify-center py-16 px-4">
      <Ionicons name="alert-circle" size={64} color="#ef4444" />
      <Text className="text-white text-xl font-bold mt-4">Error Loading Complaints</Text>
      <Text className="text-[#EEEEEE]/60 text-center mt-2">{error || 'Something went wrong'}</Text>
      <TouchableOpacity
        onPress={handleRefresh}
        className="mt-6 bg-[#00ADB5] px-6 py-3 rounded-full"
      >
        <Text className="text-white font-semibold">Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-16 px-4">
      <Ionicons name="trending-up" size={64} color="#EEEEEE40" />
      <Text className="text-white text-xl font-bold mt-4">No Trending Complaints</Text>
      <Text className="text-[#EEEEEE]/60 text-center mt-2">
        There are no trending complaints at the moment. Check back later!
      </Text>
    </View>
  );

  // Render Comment Modal
  const renderCommentModal = () => (
    <Modal
      visible={commentModalOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={closeCommentModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/70">
          {/* Modal Content */}
          <View className="flex-1 mt-16 bg-[#222831] rounded-t-3xl overflow-hidden">
            {/* Modal Header */}
            <View className="px-4 py-4 border-b border-[#393E46]">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold" numberOfLines={1}>
                    {selectedComplaint?.title}
                  </Text>
                  <Text className="text-[#00ADB5] text-xs mt-1">
                    {getCategoryLabel(selectedComplaint?.category || '')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeCommentModal}
                  className="ml-4 p-2 rounded-full bg-[#393E46]"
                >
                  <Ionicons name="close" size={24} color="#EEEEEE" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments List */}
            <ScrollView
              className="flex-1 px-4 py-4"
              showsVerticalScrollIndicator={false}
            >
              {commentsLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#00ADB5" />
                  <Text className="text-[#EEEEEE]/60 mt-3">Loading comments...</Text>
                </View>
              ) : comments.length === 0 ? (
                <View className="py-8 items-center">
                  <Ionicons name="chatbubbles-outline" size={48} color="#EEEEEE40" />
                  <Text className="text-[#EEEEEE]/60 mt-3 text-center">
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              ) : (
                comments.map(renderCommentItem)
              )}
              
              {/* Bottom spacer for input */}
              <View className="h-4" />
            </ScrollView>

            {/* Add Comment Section */}
            <View className="px-4 py-4 border-t border-[#393E46] bg-[#222831]">
              {/* Rating */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[#EEEEEE]/60 text-sm">Your Rating:</Text>
                {renderStars(commentRating, true, setCommentRating)}
              </View>

              {/* Comment Input */}
              <View className="flex-row items-end">
                <TextInput
                  className="flex-1 bg-[#393E46] rounded-xl px-4 py-3 text-white mr-3"
                  placeholder="Write a comment..."
                  placeholderTextColor="#EEEEEE50"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                  style={{ maxHeight: 100 }}
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={submittingComment || !newComment.trim()}
                  className={`p-3 rounded-xl ${
                    submittingComment || !newComment.trim() ? 'bg-[#393E46]' : 'bg-[#00ADB5]'
                  }`}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#EEEEEE" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={24}
                      color={!newComment.trim() ? '#EEEEEE50' : '#EEEEEE'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#222831] pt-7">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />

      {/* Header */}
      <View className="px-4 py-3 pt-8 border-b border-[#393E46]">
        <View className="flex-row items-center justify-center">
          <Ionicons name="trending-up" size={28} color="#00ADB5" />
          <Text className="text-white text-xl font-bold ml-2">Trending Complaints</Text>
        </View>
        <Text className="text-[#EEEEEE]/60 text-xs text-center mt-1">
          Discover the most discussed complaints in your community
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00ADB5"
            colors={['#00ADB5']}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* Loading State */}
        {isFetchingTrending && !refreshing && trendingComplaints.length === 0 && renderLoading()}

        {/* Error State */}
        {error && !isFetchingTrending && trendingComplaints.length === 0 && renderError()}

        {/* Empty State */}
        {!isFetchingTrending && !error && trendingComplaints.length === 0 && renderEmpty()}

        {/* Complaints List */}
        {trendingComplaints.map((complaint: Complaint & { score?: number }, index: number) =>
          renderComplaintCard(complaint, index)
        )}

        {/* Loading More Indicator */}
        {isFetchingMoreTrending && (
          <View className="py-6 items-center">
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#00ADB5" />
              <Text className="text-[#EEEEEE]/60 ml-3 text-sm">Loading more complaints...</Text>
            </View>
          </View>
        )}

        {/* Scroll to load more indicator */}
        {trendingHasNextPage && !isFetchingMoreTrending && trendingComplaints.length > 0 && (
          <View className="py-4 items-center">
            <View className="flex-row items-center">
              <Text className="text-[#EEEEEE]/50 text-sm">Scroll to load more</Text>
              <Ionicons name="chevron-down" size={16} color="#EEEEEE50" style={{ marginLeft: 4 }} />
            </View>
          </View>
        )}

        {/* End of List */}
        {!trendingHasNextPage && trendingComplaints.length > 0 && (
          <View className="py-6 items-center border-t border-[#393E46] mt-2">
            <Text className="text-[#EEEEEE]/50 text-sm">
              🎉 You've reached the end! No more complaints to show.
            </Text>
          </View>
        )}

        {/* Bottom Spacer */}
        <View className="h-24" />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="trending" />

      {/* Comment Modal */}
      {renderCommentModal()}
    </SafeAreaView>
  );
}
