import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Linking,
  Share,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  getComplaintById,
  upvoteComplaint,
  downvoteComplaint,
  deleteComplaint,
  setSelectedComplaint,
  Complaint,
} from '../../store/slices/complaintSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Categories
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
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  return formatDate(dateString);
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

export default function ComplaintDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { selectedComplaint, isLoading, error, isVoting, isDeleting } = useAppSelector(
    (state) => state.complaints
  );

  const [refreshing, setRefreshing] = useState(false);

  // Fetch complaint details
  useEffect(() => {
    if (id && isAuthenticated) {
      dispatch(getComplaintById(id));
    }
  }, [id, isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(setSelectedComplaint(null));
    };
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await dispatch(getComplaintById(id));
    setRefreshing(false);
  }, [id]);

  // Handle upvote
  const handleUpvote = useCallback(() => {
    if (!selectedComplaint || isVoting[selectedComplaint._id]) return;
    dispatch(upvoteComplaint(selectedComplaint._id));
  }, [selectedComplaint, isVoting]);

  // Handle downvote
  const handleDownvote = useCallback(() => {
    if (!selectedComplaint || isVoting[selectedComplaint._id]) return;
    dispatch(downvoteComplaint(selectedComplaint._id));
  }, [selectedComplaint, isVoting]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!selectedComplaint) return;

    Alert.alert(
      'Delete Complaint',
      'Are you sure you want to delete this complaint? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteComplaint(selectedComplaint._id)).unwrap();
              Alert.alert('Success', 'Complaint deleted successfully');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err || 'Failed to delete complaint');
            }
          },
        },
      ]
    );
  }, [selectedComplaint]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!selectedComplaint) return;

    try {
      await Share.share({
        message: `Check out this complaint: ${selectedComplaint.title}\n\n${selectedComplaint.description}\n\nCategory: ${getCategoryLabel(selectedComplaint.category)}\nStatus: ${getStatusInfo(selectedComplaint.status).label}`,
        title: selectedComplaint.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [selectedComplaint]);

  // Handle open in maps
  const handleOpenMaps = useCallback(() => {
    if (!selectedComplaint?.location?.coordinates) return;

    const [lng, lat] = selectedComplaint.location.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  }, [selectedComplaint]);

  // Check if current user is the complaint owner
  const isOwner = user?._id === selectedComplaint?.user_id?._id;
  const canDelete = isOwner || user?.role === 'admin';

  // Render loading state
  if (isLoading && !selectedComplaint) {
    return (
      <SafeAreaView className="flex-1 bg-[#222831]">
        <StatusBar barStyle="light-content" backgroundColor="#222831" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00ADB5" />
          <Text className="text-[#EEEEEE]/60 mt-4">Loading complaint details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !selectedComplaint) {
    return (
      <SafeAreaView className="flex-1 bg-[#222831]">
        <StatusBar barStyle="light-content" backgroundColor="#222831" />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text className="text-white text-xl font-bold mt-4">Error Loading Complaint</Text>
          <Text className="text-[#EEEEEE]/60 text-center mt-2">{error}</Text>
          <View className="flex-row mt-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-[#393E46] px-6 py-3 rounded-full mr-4"
            >
              <Text className="text-white font-semibold">Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRefresh}
              className="bg-[#00ADB5] px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render not found state
  if (!selectedComplaint) {
    return (
      <SafeAreaView className="flex-1 bg-[#222831]">
        <StatusBar barStyle="light-content" backgroundColor="#222831" />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="document-text-outline" size={64} color="#EEEEEE40" />
          <Text className="text-white text-xl font-bold mt-4">Complaint Not Found</Text>
          <Text className="text-[#EEEEEE]/60 text-center mt-2">
            The complaint you're looking for doesn't exist or has been deleted.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 bg-[#00ADB5] px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(selectedComplaint.status);
  const severityInfo = getSeverityInfo(selectedComplaint.severity);
  const categoryColor = getCategoryColor(selectedComplaint.category);

  return (
    <SafeAreaView className="flex-1 bg-[#222831] pt-7">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />

      {/* Header */}
      <View className="px-4 py-3 pt-8 border-b border-[#393E46]">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#EEEEEE" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Complaint Details</Text>
          <View className="flex-row">
            <TouchableOpacity onPress={handleShare} className="p-2">
              <Ionicons name="share-outline" size={24} color="#00ADB5" />
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting[selectedComplaint._id]}
                className="p-2"
              >
                {isDeleting[selectedComplaint._id] ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00ADB5"
            colors={['#00ADB5']}
          />
        }
      >
        {/* Main Card */}
        <View className="m-4 bg-[#393E46] rounded-2xl overflow-hidden border border-[#00ADB5]/20">
          {/* Category & Status Header */}
          <View className="px-4 py-4 border-b border-[#222831]">
            <View className="flex-row items-center justify-between">
              {/* Category */}
              <View className="flex-row items-center">
                <View
                  style={{ backgroundColor: `${categoryColor}20` }}
                  className="p-3 rounded-xl mr-3"
                >
                  <Ionicons name={getCategoryIcon(selectedComplaint.category)} size={24} color={categoryColor} />
                </View>
                <View>
                  <Text className="text-[#EEEEEE]/60 text-xs">Category</Text>
                  <Text style={{ color: categoryColor }} className="font-semibold">
                    {getCategoryLabel(selectedComplaint.category)}
                  </Text>
                </View>
              </View>

              {/* Status */}
              <View
                style={{ backgroundColor: statusInfo.bgColor }}
                className="px-4 py-2 rounded-full"
              >
                <Text style={{ color: statusInfo.color }} className="text-sm font-bold">
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Title & Severity */}
          <View className="px-4 py-4 border-b border-[#222831]">
            <View className="flex-row items-start justify-between">
              <Text className="text-white text-xl font-bold flex-1 mr-3">
                {selectedComplaint.title}
              </Text>
              {selectedComplaint.severity && (
                <View
                  style={{ backgroundColor: severityInfo.bgColor }}
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                >
                  <Text className="mr-1">{severityInfo.emoji}</Text>
                  <Text style={{ color: severityInfo.color }} className="text-sm font-medium">
                    {severityInfo.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <View className="px-4 py-4 border-b border-[#222831]">
            <Text className="text-[#00ADB5] text-sm font-semibold mb-2">Description</Text>
            <Text className="text-[#EEEEEE]/80 text-base leading-6">
              {selectedComplaint.description}
            </Text>
          </View>

          {/* Location */}
          {selectedComplaint.address && (
            <TouchableOpacity
              onPress={handleOpenMaps}
              className="px-4 py-4 border-b border-[#222831] flex-row items-center"
            >
              <View className="bg-[#00ADB5]/20 p-2 rounded-lg mr-3">
                <Ionicons name="location" size={20} color="#00ADB5" />
              </View>
              <View className="flex-1">
                <Text className="text-[#EEEEEE]/60 text-xs">Location</Text>
                <Text className="text-white text-sm">{selectedComplaint.address}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#00ADB5" />
            </TouchableOpacity>
          )}

          {/* Rail Specific Info */}
          {selectedComplaint.category === 'rail' && selectedComplaint.category_specific_data && (
            <View className="px-4 py-4 border-b border-[#222831]">
              <Text className="text-[#f59e0b] text-sm font-semibold mb-3">
                🚆 Train Information
              </Text>
              
              <View className="bg-[#222831] rounded-xl p-4">
                {/* Train Name & Number */}
                <View className="flex-row items-center mb-3">
                  <Ionicons name="train" size={20} color="#f59e0b" />
                  <Text className="text-white font-semibold ml-2 flex-1">
                    {selectedComplaint.category_specific_data.train_name || 'Unknown Train'}
                  </Text>
                  {selectedComplaint.category_specific_data.train_number && (
                    <View className="bg-[#f59e0b]/20 px-3 py-1 rounded-full">
                      <Text className="text-[#f59e0b] text-xs font-semibold">
                        #{selectedComplaint.category_specific_data.train_number}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Train Type */}
                {selectedComplaint.category_specific_data.train_type && (
                  <View className="mb-3">
                    <Text className="text-[#EEEEEE]/50 text-xs">Type</Text>
                    <Text className="text-white text-sm">
                      {selectedComplaint.category_specific_data.train_type.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}

                {/* Route */}
                {selectedComplaint.category_specific_data.routes && (
                  <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-[#393E46]">
                    {selectedComplaint.category_specific_data.routes.from_station && (
                      <View className="flex-1">
                        <Text className="text-[#EEEEEE]/50 text-xs mb-1">Origin</Text>
                        <Text className="text-[#10b981] font-medium">
                          {selectedComplaint.category_specific_data.routes.from_station.name}
                        </Text>
                        <Text className="text-[#EEEEEE]/40 text-xs">
                          ({selectedComplaint.category_specific_data.routes.from_station.code})
                        </Text>
                        {selectedComplaint.category_specific_data.routes.from_station.time && (
                          <Text className="text-[#EEEEEE]/60 text-xs mt-1">
                            Dep: {selectedComplaint.category_specific_data.routes.from_station.time.replace('.', ':')}
                          </Text>
                        )}
                      </View>
                    )}

                    <View className="mx-3">
                      <Ionicons name="arrow-forward" size={20} color="#EEEEEE40" />
                    </View>

                    {selectedComplaint.category_specific_data.routes.to_station && (
                      <View className="flex-1 items-end">
                        <Text className="text-[#EEEEEE]/50 text-xs mb-1">Destination</Text>
                        <Text className="text-[#ef4444] font-medium">
                          {selectedComplaint.category_specific_data.routes.to_station.name}
                        </Text>
                        <Text className="text-[#EEEEEE]/40 text-xs">
                          ({selectedComplaint.category_specific_data.routes.to_station.code})
                        </Text>
                        {selectedComplaint.category_specific_data.routes.to_station.time && (
                          <Text className="text-[#EEEEEE]/60 text-xs mt-1">
                            Arr: {selectedComplaint.category_specific_data.routes.to_station.time.replace('.', ':')}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* User Info */}
          {selectedComplaint.user_id && (
            <View className="px-4 py-4 border-b border-[#222831]">
              <Text className="text-[#EEEEEE]/60 text-xs mb-2">Submitted by</Text>
              <View className="flex-row items-center">
                {selectedComplaint.user_id.profileImage ? (
                  <Image
                    source={{ uri: selectedComplaint.user_id.profileImage }}
                    className="w-10 h-10 rounded-full mr-3"
                    style={{ backgroundColor: 'rgba(0, 173, 181, 0.2)' }}
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-[#00ADB5]/20 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#00ADB5" />
                  </View>
                )}
                <View>
                  <Text className="text-white font-medium">
                    {selectedComplaint.user_id.name || 'Anonymous'}
                  </Text>
                  {selectedComplaint.user_id.email && (
                    <Text className="text-[#EEEEEE]/50 text-xs">
                      {selectedComplaint.user_id.email}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Timestamps */}
          <View className="px-4 py-4">
            <View className="flex-row justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-[#EEEEEE]/50 text-xs">Created</Text>
                <Text className="text-white text-sm">{formatRelativeTime(selectedComplaint.createdAt)}</Text>
                <Text className="text-[#EEEEEE]/40 text-xs">{formatDate(selectedComplaint.createdAt)}</Text>
              </View>
              {selectedComplaint.updatedAt !== selectedComplaint.createdAt && (
                <View className="flex-1">
                  <Text className="text-[#EEEEEE]/50 text-xs">Last Updated</Text>
                  <Text className="text-white text-sm">{formatRelativeTime(selectedComplaint.updatedAt)}</Text>
                  <Text className="text-[#EEEEEE]/40 text-xs">{formatDate(selectedComplaint.updatedAt)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Actions Card */}
        <View className="mx-4 mb-4 bg-[#393E46] rounded-2xl overflow-hidden border border-[#00ADB5]/20">
          <View className="px-4 py-3 border-b border-[#222831]">
            <Text className="text-white font-semibold">Interactions</Text>
          </View>

          <View className="flex-row items-center justify-around py-4">
            {/* Upvote */}
            <TouchableOpacity
              onPress={handleUpvote}
              disabled={isVoting[selectedComplaint._id]}
              style={{
                backgroundColor: selectedComplaint.userVote === 'upvote' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              }}
              className="items-center px-4 py-2 rounded-xl"
            >
              <Ionicons
                name={selectedComplaint.userVote === 'upvote' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={28}
                color={selectedComplaint.userVote === 'upvote' ? '#10b981' : '#EEEEEE80'}
              />
              <Text
                style={{ color: selectedComplaint.userVote === 'upvote' ? '#10b981' : 'rgba(238, 238, 238, 0.6)' }}
                className="mt-1 font-semibold"
              >
                {selectedComplaint.upvote || 0}
              </Text>
              <Text className="text-[#EEEEEE]/40 text-xs">Upvote</Text>
            </TouchableOpacity>

            {/* Downvote */}
            <TouchableOpacity
              onPress={handleDownvote}
              disabled={isVoting[selectedComplaint._id]}
              style={{
                backgroundColor: selectedComplaint.userVote === 'downvote' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              }}
              className="items-center px-4 py-2 rounded-xl"
            >
              <Ionicons
                name={selectedComplaint.userVote === 'downvote' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={28}
                color={selectedComplaint.userVote === 'downvote' ? '#ef4444' : '#EEEEEE80'}
              />
              <Text
                style={{ color: selectedComplaint.userVote === 'downvote' ? '#ef4444' : 'rgba(238, 238, 238, 0.6)' }}
                className="mt-1 font-semibold"
              >
                {selectedComplaint.downvote || 0}
              </Text>
              <Text className="text-[#EEEEEE]/40 text-xs">Downvote</Text>
            </TouchableOpacity>

            {/* Comments */}
            <View className="items-center px-4 py-2">
              <Ionicons name="chatbubble-outline" size={28} color="#EEEEEE80" />
              <Text className="text-[#EEEEEE]/60 mt-1 font-semibold">
                {selectedComplaint.comments?.length || 0}
              </Text>
              <Text className="text-[#EEEEEE]/40 text-xs">Comments</Text>
            </View>
          </View>
        </View>

        {/* Evidence Section */}
        {selectedComplaint.evidence_ids && selectedComplaint.evidence_ids.length > 0 && (
          <View className="mx-4 mb-4 bg-[#393E46] rounded-2xl overflow-hidden border border-[#00ADB5]/20">
            <View className="px-4 py-3 border-b border-[#222831]">
              <Text className="text-white font-semibold">Evidence ({selectedComplaint.evidence_ids.length})</Text>
            </View>
            <View className="p-4">
              <Text className="text-[#EEEEEE]/60 text-center">
                {selectedComplaint.evidence_ids.length} file(s) attached
              </Text>
            </View>
          </View>
        )}

        {/* Comments Section Preview */}
        {selectedComplaint.comments && selectedComplaint.comments.length > 0 && (
          <View className="mx-4 mb-4 bg-[#393E46] rounded-2xl overflow-hidden border border-[#00ADB5]/20">
            <View className="px-4 py-3 border-b border-[#222831] flex-row items-center justify-between">
              <Text className="text-white font-semibold">
                Comments ({selectedComplaint.comments.length})
              </Text>
            </View>
            <View className="p-4">
              {selectedComplaint.comments.slice(0, 3).map((comment, index) => (
                <View
                  key={comment._id || index}
                  className={`py-3 ${index !== 0 ? 'border-t border-[#222831]' : ''}`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center">
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < comment.rating ? 'star' : 'star-outline'}
                          size={12}
                          color={i < comment.rating ? '#f59e0b' : '#EEEEEE40'}
                        />
                      ))}
                    </View>
                    <Text className="text-[#EEEEEE]/40 text-xs">
                      {formatRelativeTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text className="text-[#EEEEEE]/80 text-sm">{comment.comment}</Text>
                </View>
              ))}
              {selectedComplaint.comments.length > 3 && (
                <TouchableOpacity className="mt-2 py-2">
                  <Text className="text-[#00ADB5] text-center text-sm">
                    View all {selectedComplaint.comments.length} comments
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
