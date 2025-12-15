import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Location {
  latitude: number | null;
  longitude: number | null;
}

export interface CategorySpecificData {
  train_number?: string;
  train_name?: string;
  train_type?: string;
  routes?: {
    from_station?: {
      name: string;
      code: string;
      time?: string;
    };
    to_station?: {
      name: string;
      code: string;
      time?: string;
    };
  };
  stations?: any[];
}

export interface Comment {
  _id: string;
  complaint_id: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  location: {
    type: string;
    coordinates: [number, number];
  };
  address: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  category_data_id?: string;
  category_specific_data?: CategorySpecificData;
  createdAt: string;
  updatedAt: string;
  user_id?: any;
  upvote?: number;
  downvote?: number;
  userVote?: 'upvote' | 'downvote' | null;
  comments?: Comment[];
  evidence_ids?: any[];
}

export interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  location: Location;
  address: string;
  trainNumber?: string;
  evidenceFiles?: any[];
}

export interface PaginatedResponse {
  complaints: Complaint[];
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount: number;
}

interface ComplaintState {
  complaints: Complaint[];
  userComplaints: Complaint[];
  trendingComplaints: Complaint[];
  selectedComplaint: Complaint | null;
  isSubmitting: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  isDeleting: { [key: string]: boolean };
  isVoting: { [key: string]: boolean };
  error: string | null;
  success: boolean;
  lastSubmittedComplaint: Complaint | null;
  // Pagination state
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount: number;
  currentCategory: string;
  searchQuery: string;
  // Trending pagination state
  trendingNextCursor: string | null;
  trendingHasNextPage: boolean;
  isFetchingTrending: boolean;
  isFetchingMoreTrending: boolean;
}

const initialState: ComplaintState = {
  complaints: [],
  userComplaints: [],
  trendingComplaints: [],
  selectedComplaint: null,
  isSubmitting: false,
  isLoading: false,
  isFetchingMore: false,
  isDeleting: {},
  isVoting: {},
  error: null,
  success: false,
  lastSubmittedComplaint: null,
  // Pagination state
  nextCursor: null,
  hasNextPage: false,
  totalCount: 0,
  currentCategory: 'all',
  searchQuery: '',
  // Trending pagination state
  trendingNextCursor: null,
  trendingHasNextPage: false,
  isFetchingTrending: false,
  isFetchingMoreTrending: false,
};

// Submit a new complaint
export const submitComplaint = createAsyncThunk(
  'complaints/submit',
  async (complaintData: ComplaintFormData, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in to submit a complaint.');
      }

      // Validate location data
      if (!complaintData.location || !complaintData.location.latitude || !complaintData.location.longitude) {
        return thunkAPI.rejectWithValue('Location coordinates are required');
      }

      // Prepare complaint data for backend
      const formattedComplaintData = {
        title: complaintData.title,
        description: complaintData.description,
        category: complaintData.category,
        location: {
          type: 'Point',
          coordinates: [complaintData.location.longitude, complaintData.location.latitude],
        },
        address: complaintData.address,
        status: 'pending',
        timestamp: new Date().toISOString(),
        category_data_id:
          complaintData.trainNumber !== undefined && complaintData.trainNumber !== ''
            ? complaintData.trainNumber
            : 'N/A',
        severity: complaintData.severity,
      };

      console.log('Submitting complaint:', formattedComplaintData);

      const response = await axiosInstance.post('/complaints/create', formattedComplaintData);
      
      const submittedComplaint = response.data.data || response.data;
      console.log('Submitted complaint:', submittedComplaint);

      return {
        complaint: submittedComplaint,
        message: response.data.message || 'Complaint submitted successfully!',
      };
    } catch (error: any) {
      console.error('Submit complaint error:', error);
      
      let errorMessage = 'Failed to submit complaint. Please try again.';
      
      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Get user's complaints
export const getUserComplaints = createAsyncThunk(
  'complaints/getUserComplaints',
  async (_, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      const response = await axiosInstance.get('/complaints/user');
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Get user complaints error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch complaints'
      );
    }
  }
);

// Fetch user complaints with pagination and optional category filter
export const fetchUserComplaints = createAsyncThunk(
  'complaints/fetchUserComplaints',
  async (
    { category = 'all', cursor, limit = 9 }: { category?: string; cursor?: string; limit?: number },
    thunkAPI
  ) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      let endpoint = '/complaints/my-complaints/';
      const params: any = { limit };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      // Use category-specific endpoint if category is not 'all'
      if (category && category !== 'all') {
        endpoint = `/complaints/my-complaints/category/${category}`;
      }
      
      const response = await axiosInstance.get(endpoint, { params });
      
      return {
        complaints: response.data.data || [],
        nextCursor: response.data.nextCursor || null,
        hasNextPage: response.data.hasNextPage || false,
        totalCount: response.data.totalCount || 0,
        isLoadMore: !!cursor,
        category,
      };
    } catch (error: any) {
      console.error('Fetch user complaints error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch complaints'
      );
    }
  }
);

// Search user complaints
export const searchUserComplaints = createAsyncThunk(
  'complaints/searchUserComplaints',
  async (
    { searchTerm, category = 'all', cursor, limit = 9 }: { searchTerm: string; category?: string; cursor?: string; limit?: number },
    thunkAPI
  ) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      const params: any = { searchTerm, limit };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      if (category && category !== 'all') {
        params.category = category;
      }
      
      const response = await axiosInstance.get('/complaints/my-complaints/search', { params });
      
      return {
        complaints: response.data.data || [],
        nextCursor: response.data.nextCursor || null,
        hasNextPage: response.data.hasNextPage || false,
        totalCount: response.data.totalCount || 0,
        isLoadMore: !!cursor,
        searchTerm,
        category,
      };
    } catch (error: any) {
      console.error('Search user complaints error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to search complaints'
      );
    }
  }
);

// Upvote a complaint
export const upvoteComplaint = createAsyncThunk(
  'complaints/upvote',
  async (complaintId: string, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      const response = await axiosInstance.patch(`/complaints/${complaintId}/upvote`);
      
      return {
        complaintId,
        upvote: response.data.data?.upvote ?? response.data.upvote ?? 0,
        downvote: response.data.data?.downvote ?? response.data.downvote ?? 0,
        userVote: response.data.data?.userVote ?? response.data.userVote ?? null,
      };
    } catch (error: any) {
      console.error('Upvote error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to upvote'
      );
    }
  }
);

// Downvote a complaint
export const downvoteComplaint = createAsyncThunk(
  'complaints/downvote',
  async (complaintId: string, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      const response = await axiosInstance.patch(`/complaints/${complaintId}/downvote`);
      
      return {
        complaintId,
        upvote: response.data.data?.upvote ?? response.data.upvote ?? 0,
        downvote: response.data.data?.downvote ?? response.data.downvote ?? 0,
        userVote: response.data.data?.userVote ?? response.data.userVote ?? null,
      };
    } catch (error: any) {
      console.error('Downvote error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to downvote'
      );
    }
  }
);

// Delete a complaint
export const deleteComplaint = createAsyncThunk(
  'complaints/delete',
  async (complaintId: string, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      await axiosInstance.delete(`/complaints/${complaintId}`);
      
      return { complaintId };
    } catch (error: any) {
      console.error('Delete complaint error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to delete complaint'
      );
    }
  }
);

// Get all complaints
export const getAllComplaints = createAsyncThunk(
  'complaints/getAll',
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get('/complaints');
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Get all complaints error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch complaints'
      );
    }
  }
);

// Get trending complaints with pagination
export const fetchTrendingComplaints = createAsyncThunk(
  'complaints/fetchTrending',
  async ({ cursor, limit = 10 }: { cursor?: string | null; limit?: number }, thunkAPI) => {
    try {
      let url = `/complaints/trending?limit=${limit}`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const response = await axiosInstance.get(url);
      const data = response.data;
      
      // Get current user ID from auth state to determine userVote
      const state = thunkAPI.getState() as { auth: { user: { _id: string } | null } };
      const currentUserId = state.auth.user?._id;
      
      // Process complaints to add userVote
      const complaintsWithVote = (data.data || []).map((complaint: any) => {
        let userVote: 'upvote' | 'downvote' | null = null;
        if (currentUserId && complaint.votedUsers && Array.isArray(complaint.votedUsers)) {
          const userVoteEntry = complaint.votedUsers.find(
            (v: any) => {
              const voterId = typeof v.user === 'object' ? v.user?._id : v.user;
              return voterId?.toString() === currentUserId.toString();
            }
          );
          if (userVoteEntry) {
            userVote = userVoteEntry.vote;
          }
        }
        return { ...complaint, userVote };
      });

      return {
        complaints: complaintsWithVote,
        nextCursor: data.nextCursor,
        hasNextPage: data.hasNextPage,
        isLoadMore: !!cursor,
      };
    } catch (error: any) {
      console.error('Fetch trending complaints error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch trending complaints'
      );
    }
  }
);

// Get complaint by ID
export const getComplaintById = createAsyncThunk(
  'complaints/getById',
  async (complaintId: string, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      const response = await axiosInstance.get(`/complaints/${complaintId}`);
      const complaint = response.data.data || response.data;
      
      // Get current user ID from auth state to determine userVote
      const state = thunkAPI.getState() as { auth: { user: { _id: string } | null } };
      const currentUserId = state.auth.user?._id;
      
      // Calculate userVote from votedUsers array
      let userVote: 'upvote' | 'downvote' | null = null;
      if (currentUserId && complaint.votedUsers && Array.isArray(complaint.votedUsers)) {
        const userVoteEntry = complaint.votedUsers.find(
          (v: any) => {
            // Handle both populated and non-populated user field
            const voterId = typeof v.user === 'object' ? v.user?._id : v.user;
            return voterId?.toString() === currentUserId.toString();
          }
        );
        if (userVoteEntry) {
          userVote = userVoteEntry.vote;
        }
      }
      
      return { ...complaint, userVote };
    } catch (error: any) {
      console.error('Get complaint by ID error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch complaint details'
      );
    }
  }
);

// Upload evidence
export const uploadEvidence = createAsyncThunk(
  'complaints/uploadEvidence',
  async (
    {
      file,
      complaintId,
      evidenceType,
      description,
      category,
    }: {
      file: any;
      complaintId: string;
      evidenceType: string;
      description: string;
      category: string;
    },
    thunkAPI
  ) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'image/jpeg',
        name: file.fileName || 'evidence.jpg',
      } as any);
      formData.append('complaint_id', complaintId);
      formData.append('evidence_type', evidenceType);
      formData.append('description', description);
      formData.append('category', category);

      const response = await axiosInstance.post('/evidences', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Upload evidence error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to upload evidence'
      );
    }
  }
);

const complaintSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearSuccess: (state) => {
      state.success = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedComplaint: (state, action: PayloadAction<Complaint | null>) => {
      state.selectedComplaint = action.payload;
    },
    resetComplaintState: (state) => {
      state.isSubmitting = false;
      state.success = false;
      state.error = null;
      state.lastSubmittedComplaint = null;
    },
    resetUserComplaints: (state) => {
      state.userComplaints = [];
      state.nextCursor = null;
      state.hasNextPage = false;
      state.totalCount = 0;
      state.currentCategory = 'all';
      state.searchQuery = '';
    },
    setCurrentCategory: (state, action: PayloadAction<string>) => {
      state.currentCategory = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    resetTrendingComplaints: (state) => {
      state.trendingComplaints = [];
      state.trendingNextCursor = null;
      state.trendingHasNextPage = false;
    },
  },
  extraReducers: (builder) => {
    // Submit complaint
    builder
      .addCase(submitComplaint.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitComplaint.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.success = true;
        state.lastSubmittedComplaint = action.payload.complaint;
        state.userComplaints.unshift(action.payload.complaint);
        state.totalCount += 1;
      })
      .addCase(submitComplaint.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // Get user complaints (old)
    builder
      .addCase(getUserComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userComplaints = action.payload;
      })
      .addCase(getUserComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch user complaints with pagination
    builder
      .addCase(fetchUserComplaints.pending, (state, action) => {
        if (action.meta.arg.cursor) {
          state.isFetchingMore = true;
        } else {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchUserComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isFetchingMore = false;
        
        if (action.payload.isLoadMore) {
          // Append to existing complaints with deduplication
          const existingIds = new Set(state.userComplaints.map((c: any) => c._id));
          const newComplaints = action.payload.complaints.filter((c: any) => !existingIds.has(c._id));
          state.userComplaints = [...state.userComplaints, ...newComplaints];
        } else {
          // Replace complaints (fresh load)
          state.userComplaints = action.payload.complaints;
        }
        
        state.nextCursor = action.payload.nextCursor;
        state.hasNextPage = action.payload.hasNextPage;
        state.totalCount = action.payload.totalCount;
        state.currentCategory = action.payload.category;
      })
      .addCase(fetchUserComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.isFetchingMore = false;
        state.error = action.payload as string;
      });

    // Search user complaints
    builder
      .addCase(searchUserComplaints.pending, (state, action) => {
        if (action.meta.arg.cursor) {
          state.isFetchingMore = true;
        } else {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(searchUserComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isFetchingMore = false;
        
        if (action.payload.isLoadMore) {
          // Append to existing complaints with deduplication
          const existingIds = new Set(state.userComplaints.map((c: any) => c._id));
          const newComplaints = action.payload.complaints.filter((c: any) => !existingIds.has(c._id));
          state.userComplaints = [...state.userComplaints, ...newComplaints];
        } else {
          state.userComplaints = action.payload.complaints;
        }
        
        state.nextCursor = action.payload.nextCursor;
        state.hasNextPage = action.payload.hasNextPage;
        state.totalCount = action.payload.totalCount;
        state.searchQuery = action.payload.searchTerm;
        state.currentCategory = action.payload.category;
      })
      .addCase(searchUserComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.isFetchingMore = false;
        state.error = action.payload as string;
      });

    // Get all complaints
    builder
      .addCase(getAllComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.complaints = action.payload;
      })
      .addCase(getAllComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get complaint by ID
    builder
      .addCase(getComplaintById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.selectedComplaint = null;
      })
      .addCase(getComplaintById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedComplaint = action.payload;
      })
      .addCase(getComplaintById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upvote complaint
    builder
      .addCase(upvoteComplaint.pending, (state, action) => {
        state.isVoting[action.meta.arg] = true;
      })
      .addCase(upvoteComplaint.fulfilled, (state, action) => {
        state.isVoting[action.payload.complaintId] = false;
        // Update the complaint in userComplaints list
        const index = state.userComplaints.findIndex(c => c._id === action.payload.complaintId);
        if (index !== -1) {
          state.userComplaints[index] = {
            ...state.userComplaints[index],
            upvote: action.payload.upvote,
            downvote: action.payload.downvote,
            userVote: action.payload.userVote,
          };
        }
        // Update in trendingComplaints list
        const trendingIndex = state.trendingComplaints.findIndex(c => c._id === action.payload.complaintId);
        if (trendingIndex !== -1) {
          state.trendingComplaints[trendingIndex] = {
            ...state.trendingComplaints[trendingIndex],
            upvote: action.payload.upvote,
            downvote: action.payload.downvote,
            userVote: action.payload.userVote,
          };
        }
        // Also update selectedComplaint if it matches
        if (state.selectedComplaint?._id === action.payload.complaintId) {
          state.selectedComplaint = {
            ...state.selectedComplaint,
            upvote: action.payload.upvote,
            downvote: action.payload.downvote,
            userVote: action.payload.userVote,
          };
        }
      })
      .addCase(upvoteComplaint.rejected, (state, action) => {
        state.isVoting[action.meta.arg] = false;
        state.error = action.payload as string;
      });

    // Downvote complaint
    builder
      .addCase(downvoteComplaint.pending, (state, action) => {
        state.isVoting[action.meta.arg] = true;
      })
      .addCase(downvoteComplaint.fulfilled, (state, action) => {
        state.isVoting[action.payload.complaintId] = false;
        // Update the complaint in userComplaints list
        const index = state.userComplaints.findIndex(c => c._id === action.payload.complaintId);
        if (index !== -1) {
          state.userComplaints[index] = {
            ...state.userComplaints[index],
            upvote: action.payload.upvote,
            downvote: action.payload.downvote,
            userVote: action.payload.userVote,
          };
        }
        // Update in trendingComplaints list
        const trendingIndex = state.trendingComplaints.findIndex(c => c._id === action.payload.complaintId);
        if (trendingIndex !== -1) {
          state.trendingComplaints[trendingIndex] = {
            ...state.trendingComplaints[trendingIndex],
            upvote: action.payload.upvote,
            downvote: action.payload.downvote,
            userVote: action.payload.userVote,
          };
        }
        // Also update selectedComplaint if it matches
        if (state.selectedComplaint?._id === action.payload.complaintId) {
          state.selectedComplaint = {
            ...state.selectedComplaint,
            upvote: action.payload.upvote,
            downvote: action.payload.downvote,
            userVote: action.payload.userVote,
          };
        }
      })
      .addCase(downvoteComplaint.rejected, (state, action) => {
        state.isVoting[action.meta.arg] = false;
        state.error = action.payload as string;
      });

    // Delete complaint
    builder
      .addCase(deleteComplaint.pending, (state, action) => {
        state.isDeleting[action.meta.arg] = true;
      })
      .addCase(deleteComplaint.fulfilled, (state, action) => {
        state.isDeleting[action.payload.complaintId] = false;
        // Remove the complaint from the list
        state.userComplaints = state.userComplaints.filter(c => c._id !== action.payload.complaintId);
        state.totalCount = Math.max(0, state.totalCount - 1);
      })
      .addCase(deleteComplaint.rejected, (state, action) => {
        state.isDeleting[action.meta.arg] = false;
        state.error = action.payload as string;
      });

    // Upload evidence
    builder
      .addCase(uploadEvidence.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch trending complaints
    builder
      .addCase(fetchTrendingComplaints.pending, (state, action) => {
        if (action.meta.arg.cursor) {
          state.isFetchingMoreTrending = true;
        } else {
          state.isFetchingTrending = true;
        }
        state.error = null;
      })
      .addCase(fetchTrendingComplaints.fulfilled, (state, action) => {
        state.isFetchingTrending = false;
        state.isFetchingMoreTrending = false;
        
        if (action.payload.isLoadMore) {
          // Append to existing complaints with deduplication
          const existingIds = new Set(state.trendingComplaints.map((c: any) => c._id));
          const newComplaints = action.payload.complaints.filter((c: any) => !existingIds.has(c._id));
          state.trendingComplaints = [...state.trendingComplaints, ...newComplaints];
        } else {
          // Replace complaints
          state.trendingComplaints = action.payload.complaints;
        }
        
        state.trendingNextCursor = action.payload.nextCursor;
        state.trendingHasNextPage = action.payload.hasNextPage;
      })
      .addCase(fetchTrendingComplaints.rejected, (state, action) => {
        state.isFetchingTrending = false;
        state.isFetchingMoreTrending = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearSuccess, 
  clearError, 
  setSelectedComplaint, 
  resetComplaintState,
  resetUserComplaints,
  setCurrentCategory,
  setSearchQuery,
  resetTrendingComplaints,
} = complaintSlice.actions;

export default complaintSlice.reducer;
