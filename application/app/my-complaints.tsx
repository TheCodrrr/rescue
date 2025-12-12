import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchUserComplaints,
  searchUserComplaints,
  upvoteComplaint,
  downvoteComplaint,
  deleteComplaint,
  resetUserComplaints,
  Complaint,
} from '../store/slices/complaintSlice';
import BottomNavigation from '../components/BottomNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function MyComplaintsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const {
    userComplaints,
    isLoading,
    isFetchingMore,
    isDeleting,
    isVoting,
    error,
    nextCursor,
    hasNextPage,
    totalCount,
  } = useAppSelector((state) => state.complaints);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedComplaintForDelete, setSelectedComplaintForDelete] = useState<Complaint | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch complaints when component mounts or filters change
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(resetUserComplaints());
      
      if (debouncedSearch.trim()) {
        dispatch(searchUserComplaints({ searchTerm: debouncedSearch, category: selectedCategory }));
      } else {
        dispatch(fetchUserComplaints({ category: selectedCategory }));
      }
    }
  }, [isAuthenticated, selectedCategory, debouncedSearch]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to view your complaints.',
        [
          { text: 'Cancel', onPress: () => router.back() },
          { text: 'Login', onPress: () => router.push('/login') },
        ]
      );
    }
  }, [isAuthenticated]);

  // Load more complaints
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingMore && !isLoading && nextCursor) {
      if (debouncedSearch.trim()) {
        dispatch(searchUserComplaints({ 
          searchTerm: debouncedSearch, 
          category: selectedCategory, 
          cursor: nextCursor 
        }));
      } else {
        dispatch(fetchUserComplaints({ category: selectedCategory, cursor: nextCursor }));
      }
    }
  }, [hasNextPage, isFetchingMore, isLoading, nextCursor, debouncedSearch, selectedCategory]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(resetUserComplaints());
    
    if (debouncedSearch.trim()) {
      await dispatch(searchUserComplaints({ searchTerm: debouncedSearch, category: selectedCategory }));
    } else {
      await dispatch(fetchUserComplaints({ category: selectedCategory }));
    }
    
    setRefreshing(false);
  }, [debouncedSearch, selectedCategory]);

  // Handle scroll to detect when to load more
  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 100;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom) {
        loadMore();
      }
    },
    [loadMore]
  );

  // Handle upvote
  const handleUpvote = useCallback(
    (complaintId: string) => {
      if (isVoting[complaintId]) return;
      dispatch(upvoteComplaint(complaintId));
    },
    [isVoting]
  );

  // Handle downvote
  const handleDownvote = useCallback(
    (complaintId: string) => {
      if (isVoting[complaintId]) return;
      dispatch(downvoteComplaint(complaintId));
    },
    [isVoting]
  );

  // Handle delete
  const openDeleteModal = (complaint: Complaint) => {
    setSelectedComplaintForDelete(complaint);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setSelectedComplaintForDelete(null);
  };

  const handleDelete = useCallback(async () => {
    if (!selectedComplaintForDelete) return;
    
    try {
      await dispatch(deleteComplaint(selectedComplaintForDelete._id)).unwrap();
      Alert.alert('Success', 'Complaint deleted successfully');
      closeDeleteModal();
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to delete complaint');
    }
  }, [selectedComplaintForDelete]);

  // Handle visit complaint detail
  const handleVisitComplaint = (complaintId: string) => {
    // TODO: Navigate to complaint detail page
    router.push(`/complaint/${complaintId}` as any);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  // Highlight search text
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === search.toLowerCase() ? (
        <Text key={index} style={{ backgroundColor: '#00ADB5', color: '#222831', fontWeight: '600' }}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  // Render complaint card
  const renderComplaintCard = (complaint: Complaint, index: number) => {
    const statusInfo = getStatusInfo(complaint.status);
    const severityInfo = getSeverityInfo(complaint.severity);
    const categoryColor = getCategoryColor(complaint.category);

    return (
      <View
        key={complaint._id || index}
        className="bg-[#393E46] rounded-2xl mb-4 overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: 'rgba(0, 173, 181, 0.2)',
        }}
      >
        {/* Card Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#222831]">
          <View className="flex-row items-center flex-1">
            <View
              style={{ backgroundColor: `${categoryColor}20` }}
              className="p-2 rounded-lg mr-3"
            >
              <Ionicons name={getCategoryIcon(complaint.category)} size={20} color={categoryColor} />
            </View>
            <Text className="text-[#EEEEEE]/80 text-sm" numberOfLines={1}>
              {getCategoryLabel(complaint.category)}
            </Text>
          </View>

          <View className="flex-row items-center">
            {/* Status Badge */}
            <View
              style={{ backgroundColor: statusInfo.bgColor }}
              className="px-3 py-1 rounded-full mr-2"
            >
              <Text style={{ color: statusInfo.color }} className="text-xs font-semibold">
                {statusInfo.label}
              </Text>
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              onPress={() => openDeleteModal(complaint)}
              disabled={isDeleting[complaint._id]}
              className="p-2"
            >
              {isDeleting[complaint._id] ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              )}
            </TouchableOpacity>

            {/* Visit Button */}
            <TouchableOpacity
              onPress={() => handleVisitComplaint(complaint._id)}
              className="p-2"
            >
              <Ionicons name="open-outline" size={18} color="#00ADB5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Body */}
        <View className="px-4 py-3">
          {/* Title and Severity */}
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-white text-base font-semibold flex-1 mr-2" numberOfLines={2}>
              {debouncedSearch ? highlightText(complaint.title, debouncedSearch) : complaint.title}
            </Text>
            
            {complaint.severity && (
              <View
                style={{ backgroundColor: severityInfo.bgColor }}
                className="flex-row items-center px-2 py-1 rounded-full"
              >
                <Text className="mr-1">{severityInfo.emoji}</Text>
                <Text style={{ color: severityInfo.color }} className="text-xs font-medium">
                  {severityInfo.label}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text className="text-[#EEEEEE]/70 text-sm mb-3" numberOfLines={3}>
            {debouncedSearch ? highlightText(complaint.description, debouncedSearch) : complaint.description}
          </Text>

          {/* Address */}
          {complaint.address && (
            <View className="flex-row items-center mb-3">
              <Ionicons name="location-outline" size={14} color="#00ADB5" />
              <Text className="text-[#EEEEEE]/60 text-xs ml-1 flex-1" numberOfLines={1}>
                {complaint.address}
              </Text>
            </View>
          )}

          {/* Rail specific info */}
          {complaint.category === 'rail' && complaint.category_specific_data && (
            <View className="bg-[#222831] rounded-xl p-3 mb-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="train" size={16} color="#f59e0b" />
                <Text className="text-[#f59e0b] font-semibold ml-2">
                  {complaint.category_specific_data.train_name || complaint.category_data_id}
                </Text>
                {complaint.category_specific_data.train_number && (
                  <View className="bg-[#f59e0b]/20 px-2 py-0.5 rounded ml-2">
                    <Text className="text-[#f59e0b] text-xs">
                      {complaint.category_specific_data.train_number}
                    </Text>
                  </View>
                )}
              </View>
              
              {complaint.category_specific_data.routes && (
                <View className="flex-row items-center justify-between">
                  {complaint.category_specific_data.routes.from_station && (
                    <View className="flex-1">
                      <Text className="text-[#EEEEEE]/50 text-xs">Origin</Text>
                      <Text className="text-[#10b981] text-sm font-medium">
                        {complaint.category_specific_data.routes.from_station.name}
                      </Text>
                      <Text className="text-[#EEEEEE]/40 text-xs">
                        ({complaint.category_specific_data.routes.from_station.code})
                      </Text>
                    </View>
                  )}
                  
                  <Ionicons name="arrow-forward" size={16} color="#EEEEEE40" />
                  
                  {complaint.category_specific_data.routes.to_station && (
                    <View className="flex-1 items-end">
                      <Text className="text-[#EEEEEE]/50 text-xs">Destination</Text>
                      <Text className="text-[#ef4444] text-sm font-medium">
                        {complaint.category_specific_data.routes.to_station.name}
                      </Text>
                      <Text className="text-[#EEEEEE]/40 text-xs">
                        ({complaint.category_specific_data.routes.to_station.code})
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Meta Info */}
          <View className="flex-row items-center justify-between pt-2 border-t border-[#222831]">
            <Text className="text-[#EEEEEE]/50 text-xs">
              {formatDate(complaint.createdAt)}
            </Text>

            {/* Actions */}
            <View className="flex-row items-center">
              {/* Upvote */}
              <TouchableOpacity
                onPress={() => handleUpvote(complaint._id)}
                disabled={isVoting[complaint._id]}
                className={`flex-row items-center mr-4 px-2 py-1 rounded-lg ${
                  complaint.userVote === 'upvote' ? 'bg-[#10b981]/20' : ''
                }`}
              >
                <Ionicons
                  name={complaint.userVote === 'upvote' ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={16}
                  color={complaint.userVote === 'upvote' ? '#10b981' : '#EEEEEE80'}
                />
                <Text
                  className={`ml-1 text-sm ${
                    complaint.userVote === 'upvote' ? 'text-[#10b981]' : 'text-[#EEEEEE]/60'
                  }`}
                >
                  {complaint.upvote || 0}
                </Text>
              </TouchableOpacity>

              {/* Downvote */}
              <TouchableOpacity
                onPress={() => handleDownvote(complaint._id)}
                disabled={isVoting[complaint._id]}
                className={`flex-row items-center mr-4 px-2 py-1 rounded-lg ${
                  complaint.userVote === 'downvote' ? 'bg-[#ef4444]/20' : ''
                }`}
              >
                <Ionicons
                  name={complaint.userVote === 'downvote' ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={16}
                  color={complaint.userVote === 'downvote' ? '#ef4444' : '#EEEEEE80'}
                />
                <Text
                  className={`ml-1 text-sm ${
                    complaint.userVote === 'downvote' ? 'text-[#ef4444]' : 'text-[#EEEEEE]/60'
                  }`}
                >
                  {complaint.downvote || 0}
                </Text>
              </TouchableOpacity>

              {/* Comments */}
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={16} color="#EEEEEE80" />
                <Text className="text-[#EEEEEE]/60 ml-1 text-sm">
                  {complaint.comments?.length || 0}
                </Text>
              </View>
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
      <Text className="text-[#EEEEEE]/60 mt-4">Loading your complaints...</Text>
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
      <Text className="text-4xl mb-4">📋</Text>
      <Text className="text-white text-xl font-bold">No Complaints Yet</Text>
      <Text className="text-[#EEEEEE]/60 text-center mt-2">
        You haven't submitted any complaints yet. Start by creating one!
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/complain')}
        className="mt-6 bg-[#00ADB5] px-6 py-3 rounded-full flex-row items-center"
      >
        <Ionicons name="add" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">Create Complaint</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-[#222831]">
        <StatusBar barStyle="light-content" backgroundColor="#222831" />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed" size={64} color="#00ADB5" />
          <Text className="text-white text-xl font-bold mt-4">Authentication Required</Text>
          <Text className="text-[#EEEEEE]/60 text-center mt-2">
            Please log in to view your complaints.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            className="mt-6 bg-[#00ADB5] px-8 py-3 rounded-full"
          >
            <Text className="text-white font-semibold text-lg">Login</Text>
          </TouchableOpacity>
        </View>
        <BottomNavigation activeTab="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#222831]">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />

      {/* Header */}
      <View className="px-4 py-3 pt-8 border-b border-[#393E46]">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#EEEEEE" />
          </TouchableOpacity>
          <View className="items-center flex-1">
            <Text className="text-white text-lg font-bold">My Complaints</Text>
            <Text className="text-[#EEEEEE]/60 text-xs">
              Track the status of your submitted complaints
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/complain')} className="p-2">
            <Ionicons name="add-circle" size={28} color="#00ADB5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View className="px-4 py-3 bg-[#393E46]/30 border-b border-[#393E46]">
        {/* Search Bar */}
        <View className="flex-row items-center bg-[#393E46] rounded-xl px-3 mb-3">
          <Ionicons name="search" size={20} color="#00ADB5" />
          <TextInput
            className="flex-1 py-3 px-2 text-white"
            placeholder="Search complaints..."
            placeholderTextColor="rgba(238, 238, 238, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#EEEEEE80" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <TouchableOpacity
          onPress={() => setShowCategoryPicker(true)}
          className="flex-row items-center justify-between bg-[#393E46] rounded-xl px-4 py-3 mb-3"
        >
          <View className="flex-row items-center">
            <Ionicons name="filter" size={18} color="#00ADB5" />
            <Text className="text-white ml-2">
              {selectedCategory === 'all' ? 'All Categories' : getCategoryLabel(selectedCategory)}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#EEEEEE80" />
        </TouchableOpacity>

        {/* Results Summary */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[#EEEEEE]/70 text-sm">
            Showing {userComplaints.length} of {totalCount} complaints
            {selectedCategory !== 'all' && (
              <Text className="text-[#00ADB5]"> in {getCategoryLabel(selectedCategory)}</Text>
            )}
          </Text>
          
          {(searchQuery || selectedCategory !== 'all') && (
            <TouchableOpacity onPress={clearFilters}>
              <Text className="text-[#00ADB5] text-sm font-semibold">Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
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
        scrollEventThrottle={400}
      >
        {/* Create New Complaint Button */}
        <TouchableOpacity
          onPress={() => router.push('/complain')}
          className="bg-[#393E46] rounded-2xl mb-4 p-6 items-center justify-center border border-dashed border-[#00ADB5]/50"
          style={{ minHeight: 100 }}
        >
          <View className="flex-row items-center">
            <Ionicons name="add-circle-outline" size={28} color="#00ADB5" />
            <Text className="text-white text-lg font-semibold ml-2">Create New Complaint</Text>
          </View>
        </TouchableOpacity>

        {/* Loading State */}
        {isLoading && !refreshing && userComplaints.length === 0 && renderLoading()}

        {/* Error State */}
        {error && !isLoading && userComplaints.length === 0 && renderError()}

        {/* Empty State */}
        {!isLoading && !error && userComplaints.length === 0 && renderEmpty()}

        {/* Complaints List */}
        {userComplaints.map((complaint: Complaint, index: number) => renderComplaintCard(complaint, index))}

        {/* Loading More Indicator */}
        {isFetchingMore && (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#00ADB5" />
            <Text className="text-[#EEEEEE]/60 mt-2 text-sm">Loading more complaints...</Text>
          </View>
        )}

        {/* End of List */}
        {!hasNextPage && userComplaints.length > 0 && (
          <View className="py-6 items-center border-t border-[#393E46] mt-2">
            <Text className="text-[#EEEEEE]/50 text-sm italic">
              You've reached the end of your complaints
            </Text>
          </View>
        )}

        {/* Bottom Spacer */}
        <View className="h-24" />
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable className="bg-[#393E46] rounded-t-3xl" onPress={(e) => e.stopPropagation()}>
            <View className="items-center py-3 border-b border-[#222831]">
              <View className="w-10 h-1 bg-[#EEEEEE]/30 rounded-full" />
            </View>
            
            <Text className="text-white text-lg font-bold text-center py-4">Select Category</Text>
            
            <ScrollView className="max-h-96">
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory('all');
                  setShowCategoryPicker(false);
                }}
                className={`flex-row items-center px-6 py-4 border-b border-[#222831] ${
                  selectedCategory === 'all' ? 'bg-[#00ADB5]/20' : ''
                }`}
              >
                <Ionicons name="apps" size={24} color={selectedCategory === 'all' ? '#00ADB5' : '#EEEEEE'} />
                <Text
                  className={`ml-4 text-base ${
                    selectedCategory === 'all' ? 'text-[#00ADB5] font-semibold' : 'text-white'
                  }`}
                >
                  All Categories
                </Text>
                {selectedCategory === 'all' && (
                  <Ionicons name="checkmark" size={20} color="#00ADB5" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => {
                    setSelectedCategory(cat.value);
                    setShowCategoryPicker(false);
                  }}
                  className={`flex-row items-center px-6 py-4 border-b border-[#222831] ${
                    selectedCategory === cat.value ? 'bg-[#00ADB5]/20' : ''
                  }`}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={selectedCategory === cat.value ? '#00ADB5' : cat.color}
                  />
                  <Text
                    className={`ml-4 text-base ${
                      selectedCategory === cat.value ? 'text-[#00ADB5] font-semibold' : 'text-white'
                    }`}
                  >
                    {cat.label}
                  </Text>
                  {selectedCategory === cat.value && (
                    <Ionicons name="checkmark" size={20} color="#00ADB5" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View className="h-8" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <Pressable className="flex-1 bg-black/70 items-center justify-center px-6" onPress={closeDeleteModal}>
          <Pressable className="bg-[#393E46] rounded-2xl w-full max-w-md p-6" onPress={(e) => e.stopPropagation()}>
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-[#ef4444]/20 items-center justify-center mb-4">
                <Ionicons name="warning" size={32} color="#ef4444" />
              </View>
              <Text className="text-white text-xl font-bold">Delete Complaint</Text>
            </View>

            {selectedComplaintForDelete && (
              <Text className="text-[#00ADB5] text-center font-medium mb-2" numberOfLines={2}>
                "{selectedComplaintForDelete.title}"
              </Text>
            )}

            <Text className="text-[#EEEEEE]/70 text-center mb-6">
              Are you sure you want to delete this complaint? This action cannot be undone.
            </Text>

            <View className="flex-row">
              <TouchableOpacity
                onPress={closeDeleteModal}
                className="flex-1 bg-[#222831] py-3 rounded-xl mr-2"
              >
                <Text className="text-white text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={selectedComplaintForDelete ? isDeleting[selectedComplaintForDelete._id] : false}
                className="flex-1 bg-[#ef4444] py-3 rounded-xl ml-2 flex-row items-center justify-center"
              >
                {selectedComplaintForDelete && isDeleting[selectedComplaintForDelete._id] ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="white" />
                    <Text className="text-white font-semibold ml-2">Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="profile" />
    </SafeAreaView>
  );
}
