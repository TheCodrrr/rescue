import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  complaints: [],
  selectedComplaint: null,
  isSubmitting: false,
  isLoading: false,
  error: null,
  success: false,
  lastSubmittedComplaint: null,
};

// 👇 Thunk to submit a new complaint
export const submitComplaint = createAsyncThunk(
  'complaints/submit',
  async (complaintData, thunkAPI) => {
    try {
      // console.log("Making API call to submit complaint...", complaintData);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
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
          type: "Point",
          coordinates: [complaintData.location.longitude, complaintData.location.latitude]
        }, // Convert to GeoJSON format
        address: complaintData.address, // Address is a separate field in the complaint data
        status: 'pending', // Default status
        timestamp: new Date().toISOString(),
        category_data_id: complaintData.category_data_id !== undefined && complaintData.category_data_id !== ''
          ? complaintData.category_data_id
          : 'N/A',
        severity: complaintData.severity
      };

      console.log("Original complaint data:", complaintData);
      console.log("Formatted complaint data:", formattedComplaintData);
      console.log("Token found, making request to submit complaint");
      
      const response = await axiosInstance.post('/complaints/create', formattedComplaintData);
      // console.log("Submit complaint API response:", response.data);
      
      // Extract complaint data from the response
      const submittedComplaint = response.data.data || response.data;
      console.log("Submitted complaint data:", submittedComplaint);
      
      return {
        complaint: submittedComplaint,
        message: response.data.message || 'Complaint submitted successfully!'
      };
    } catch (error) {
      console.error("Submit complaint API error:", error);
      console.error("Error response:", error.response?.data);
      
      let errorMessage = 'Failed to submit complaint. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to get user's complaints
export const getUserComplaints = createAsyncThunk(
  'complaints/getUserComplaints',
  async (_, thunkAPI) => {
    try {
      console.log("Making API call to get user complaints...");
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('Authentication required');
      }

      console.log("Token found, making request to get user complaints");
      const response = await axiosInstance.get('/complaints/my-complaints');
      console.log("Get user complaints API response:", response.data);
      
      // Extract complaints data from the response
      const complaints = response.data.data || response.data;
      console.log("User complaints data:", complaints);
      
      return complaints;
    } catch (error) {
      console.error("Get user complaints API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load complaints';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to get all complaints (for admin or public view)
export const getAllComplaints = createAsyncThunk(
  'complaints/getAllComplaints',
  async (filters = {}, thunkAPI) => {
    try {
      console.log("Making API call to get all complaints...", filters);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.page) queryParams.append('page', filters.page);
      
      const queryString = queryParams.toString();
      const endpoint = `/complaints${queryString ? `?${queryString}` : ''}`;
      
      console.log("Making request to:", endpoint);
      const response = await axiosInstance.get(endpoint);
      console.log("Get all complaints API response:", response.data);
      
      // Extract complaints data from the response
      const complaints = response.data.data || response.data;
      console.log("All complaints data:", complaints);
      
      return complaints;
    } catch (error) {
      console.error("Get all complaints API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load complaints';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to get nearby complaints (past 30 minutes)
export const getNearbyComplaints = createAsyncThunk(
  'complaints/getNearbyComplaints',
  async ({ latitude, longitude }, thunkAPI) => {
    try {
      console.log("🌍 [API] Making request to get nearby complaints...", { latitude, longitude });
      console.log("🌍 [API] Request URL:", `/complaints/nearby?latitude=${latitude}&longitude=${longitude}`);
      
      const response = await axiosInstance.get(`/complaints/nearby?latitude=${latitude}&longitude=${longitude}`);
      console.log("🌍 [API] Full response received:", response);
      console.log("🌍 [API] Response status:", response.status);
      console.log("🌍 [API] Response data:", response.data);
      
      // Extract complaints data from the response
      const complaints = response.data.complaints || response.data.data || response.data;
      console.log("🌍 [API] Extracted complaints array:", complaints);
      console.log("🌍 [API] Number of complaints extracted:", complaints?.length || 0);
      
      if (complaints && complaints.length > 0) {
        console.log("🌍 [API] First complaint sample:", complaints[0]);
        console.log("🌍 [API] All complaint IDs:", complaints.map(c => c._id));
      }
      
      return complaints;
    } catch (error) {
      console.error("Get nearby complaints API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load nearby complaints';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to fetch a single complaint by ID
export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchComplaintById',
  async (complaintId, thunkAPI) => {
    try {
      console.log("Making API call to fetch complaint by ID...", complaintId);
      
      const response = await axiosInstance.get(`/complaints/${complaintId}`);
      console.log("Fetch complaint by ID API response:", response.data);
      
      // Extract complaint data from the response
      const complaint = response.data.data || response.data;
      console.log("Complaint data:", complaint);
      
      return complaint;
    } catch (error) {
      console.error("Fetch complaint by ID API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load complaint details';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to upvote a complaint
export const upvoteComplaint = createAsyncThunk(
  'complaints/upvote',
  async (complaintId, thunkAPI) => {
    try {
      console.log("Making API call to upvote complaint...", complaintId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('Authentication required');
      }

      console.log("Token found, making request to upvote complaint");
      const response = await axiosInstance.patch(`/complaints/${complaintId}/upvote`);
      console.log("Upvote complaint API response:", response.data);
      
      // Try multiple ways to extract the data
      let responseData;
      if (response.data.data) {
        responseData = response.data.data;
      } else if (response.data.complaint) {
        responseData = response.data.complaint;
      } else {
        responseData = response.data;
      }
      
      console.log("Parsed upvote response data:", responseData);
      
      // Try all possible field names - check singular first since that's the correct format
      const upvotes = responseData.upvote ?? responseData.upvotes ?? 0;
      const downvotes = responseData.downvote ?? responseData.downvotes ?? 0;
      const userVote = responseData.userVote ?? null;
      
      const payload = {
        complaintId,
        upvotes: Number(upvotes),
        downvotes: Number(downvotes),
        userVote: userVote
      };
      
      console.log("Final payload with extracted votes:", payload);
      return payload;
    } catch (error) {
      console.error("Upvote complaint API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to upvote complaint';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to downvote a complaint
export const downvoteComplaint = createAsyncThunk(
  'complaints/downvote',
  async (complaintId, thunkAPI) => {
    try {
      console.log("Making API call to downvote complaint...", complaintId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('Authentication required');
      }

      console.log("Token found, making request to downvote complaint");
      const response = await axiosInstance.patch(`/complaints/${complaintId}/downvote`);
      console.log("Downvote complaint API response:", response.data);
      
      // Try multiple ways to extract the data
      let responseData;
      if (response.data.data) {
        responseData = response.data.data;
      } else if (response.data.complaint) {
        responseData = response.data.complaint;
      } else {
        responseData = response.data;
      }
      
      console.log("Parsed downvote response data:", responseData);
      
      // Try all possible field names - check singular first since that's the correct format
      const upvotes = responseData.upvote ?? responseData.upvotes ?? 0;
      const downvotes = responseData.downvote ?? responseData.downvotes ?? 0;
      const userVote = responseData.userVote ?? null;
      
      const payload = {
        complaintId,
        upvotes: Number(upvotes),
        downvotes: Number(downvotes),
        userVote: userVote
      };
      
      console.log("Final payload with extracted votes:", payload);
      return payload;
    } catch (error) {
      console.error("Downvote complaint API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to downvote complaint';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to update complaint status
export const updateComplaintStatus = createAsyncThunk(
  'complaints/updateStatus',
  async ({ complaintId, status }, thunkAPI) => {
    try {
      console.log("Making API call to update complaint status...", { complaintId, status });
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('Authentication required');
      }

      console.log("Token found, making request to update complaint status");
      const response = await axiosInstance.patch(`/complaints/${complaintId}/status`, { status });
      console.log("Update complaint status API response:", response.data);
      
      // Try multiple ways to extract the data
      let responseData;
      if (response.data.data) {
        responseData = response.data.data;
      } else if (response.data.complaint) {
        responseData = response.data.complaint;
      } else {
        responseData = response.data;
      }
      
      console.log("Parsed update status response data:", responseData);
      
      const payload = {
        complaintId,
        status: responseData.status || status,
        updatedAt: responseData.updatedAt || new Date().toISOString()
      };
      
      console.log("Final payload for status update:", payload);
      return payload;
    } catch (error) {
      console.error("Update complaint status API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update complaint status';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to delete a complaint
export const deleteComplaint = createAsyncThunk(
  'complaints/delete',
  async (complaintId, thunkAPI) => {
    try {
      console.log("Making API call to delete complaint...", complaintId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('Authentication required');
      }

      console.log("Token found, making request to delete complaint");
      const response = await axiosInstance.delete(`/complaints/${complaintId}`);
      console.log("Delete complaint API response:", response.data);
      
      return {
        complaintId,
        message: response.data.message || 'Complaint deleted successfully!'
      };
    } catch (error) {
      console.error("Delete complaint API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to delete complaint';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Add comment to complaint
export const addComment = createAsyncThunk(
  'complaints/addComment',
  async ({ complaintId, content, rating = 5 }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in to add a comment.');
      }

      // Get user ID from auth state
      const state = thunkAPI.getState();
      const user = state.auth.user;
      
      if (!user) {
        return thunkAPI.rejectWithValue('User information not available. Please log in again.');
      }

      const userId = user._id || user.id;

      console.log(`Adding comment to complaint ${complaintId} by user ${userId}`);
      
      const requestBody = {
        complaint_id: complaintId,
        user_id: userId,
        rating: rating,
        comment: content
      };

      console.log("Comment request body:", requestBody);
      
      const response = await axiosInstance.post(`/feedbacks/`, requestBody);
      
      console.log("Add comment API response:", response);
      
      return {
        complaintId,
        comment: response.data.data || response.data
      };
    } catch (error) {
      console.error("Add comment error:", error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to add comment';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Fetch comments for a complaint
export const fetchComments = createAsyncThunk(
  'complaints/fetchComments',
  async (complaintId, thunkAPI) => {
    try {
      console.log(`Fetching comments for complaint ${complaintId}`);
      
      const response = await axiosInstance.get(`/feedbacks/complaint/${complaintId}`);
      
      console.log("Fetch comments API response:", response.data);
      console.log("Complete response:", JSON.stringify(response.data, null, 2));
      
      // The response.data.data contains an array of comments directly
      const commentsArray = response.data.data || [];
      
      console.log("Extracted comments array:", commentsArray);
      console.log("Number of comments found:", commentsArray.length);
      
      return {
        complaintId,
        comments: commentsArray,
        complaintData: response.data
      };
    } catch (error) {
      console.error("Fetch comments error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to fetch comments';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Update a comment
export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ commentId, comment, rating }, thunkAPI) => {
    try {
      console.log(`Updating comment ${commentId}`, { comment, rating });
      
      const response = await axiosInstance.patch(`/feedbacks/${commentId}`, {
        comment,
        rating
      });
      
      console.log("Update comment API response:", response.data);
      
      return {
        commentId,
        updatedComment: response.data.data || response.data
      };
    } catch (error) {
      console.error("Update comment error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update comment';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Delete a comment
export const removeComment = createAsyncThunk(
  'comments/removeComment',
  async (commentId, thunkAPI) => {
    try {
      console.log(`Deleting comment ${commentId}`);
      
      const response = await axiosInstance.delete(`/feedbacks/${commentId}`);
      
      console.log("Delete comment API response:", response.data);
      
      return {
        commentId,
        message: response.data.message || 'Comment deleted successfully'
      };
    } catch (error) {
      console.error("Delete comment error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to delete comment';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

const complaintSlice = createSlice({
  name: "complaints",
  initialState,
  reducers: {
    // Clear success state
    clearSuccess: (state) => {
      state.success = false;
      state.lastSubmittedComplaint = null;
    },
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
    // Reset complaint state
    resetComplaintState: (state) => {
      state.isSubmitting = false;
      state.error = null;
      state.success = false;
      state.lastSubmittedComplaint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit complaint cases
      .addCase(submitComplaint.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitComplaint.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.success = true;
        state.lastSubmittedComplaint = action.payload.complaint;
        state.error = null;
        
        // Add the new complaint to the complaints array if it exists
        if (action.payload.complaint) {
          state.complaints.unshift(action.payload.complaint);
        }
      })
      .addCase(submitComplaint.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
        state.success = false;
      })
      // Get user complaints cases
      .addCase(getUserComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.complaints = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(getUserComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.complaints = [];
      })
      // Get all complaints cases
      .addCase(getAllComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.complaints = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(getAllComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.complaints = [];
      })
      // Get nearby complaints cases
      .addCase(getNearbyComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getNearbyComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.complaints = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(getNearbyComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.complaints = [];
      })
      // Fetch complaint by ID cases
      .addCase(fetchComplaintById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.selectedComplaint = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedComplaint = action.payload;
        state.error = null;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.selectedComplaint = null;
      })
      // Upvote complaint cases
      .addCase(upvoteComplaint.pending, (state) => {
        state.error = null;
      })
      .addCase(upvoteComplaint.fulfilled, (state, action) => {
        console.log("Upvote fulfilled with payload:", action.payload);
        const { complaintId, upvotes, downvotes, userVote } = action.payload;
        console.log("Looking for complaint with ID:", complaintId, "Type:", typeof complaintId);
        console.log("All complaint IDs in state:", state.complaints.map(c => ({ id: c._id, type: typeof c._id, title: c.title })));
        
        // Try different ways to match the complaint ID
        const complaint = state.complaints.find(c => 
          c._id === complaintId || 
          c._id?.toString() === complaintId?.toString() ||
          c.id === complaintId ||
          c.id?.toString() === complaintId?.toString()
        );
        
        console.log("Found complaint for upvote:", complaint);
        
        if (complaint) {
          console.log("Before update - upvote:", complaint.upvote, "downvote:", complaint.downvote);
          complaint.upvote = upvotes;
          complaint.downvote = downvotes;
          complaint.userVote = userVote;
          console.log("After update - upvote:", complaint.upvote, "downvote:", complaint.downvote, "userVote:", complaint.userVote);
        } else {
          console.error("Could not find complaint with ID:", complaintId);
        }
        
        // Also update selectedComplaint if it matches the voted complaint
        if (state.selectedComplaint && (
          state.selectedComplaint._id === complaintId ||
          state.selectedComplaint._id?.toString() === complaintId?.toString() ||
          state.selectedComplaint.id === complaintId ||
          state.selectedComplaint.id?.toString() === complaintId?.toString()
        )) {
          console.log("Updating selectedComplaint upvotes/downvotes");
          state.selectedComplaint.upvote = upvotes;
          state.selectedComplaint.downvote = downvotes;
          state.selectedComplaint.userVote = userVote;
        }
        
        state.error = null;
      })
      .addCase(upvoteComplaint.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Downvote complaint cases
      .addCase(downvoteComplaint.pending, (state) => {
        state.error = null;
      })
      .addCase(downvoteComplaint.fulfilled, (state, action) => {
        console.log("Downvote fulfilled with payload:", action.payload);
        const { complaintId, upvotes, downvotes, userVote } = action.payload;
        console.log("Looking for complaint with ID:", complaintId, "Type:", typeof complaintId);
        console.log("All complaint IDs in state:", state.complaints.map(c => ({ id: c._id, type: typeof c._id, title: c.title })));
        
        // Try different ways to match the complaint ID
        const complaint = state.complaints.find(c => 
          c._id === complaintId || 
          c._id?.toString() === complaintId?.toString() ||
          c.id === complaintId ||
          c.id?.toString() === complaintId?.toString()
        );
        
        console.log("Found complaint for downvote:", complaint);
        
        if (complaint) {
          console.log("Before update - upvote:", complaint.upvote, "downvote:", complaint.downvote);
          complaint.upvote = upvotes;
          complaint.downvote = downvotes;
          complaint.userVote = userVote;
          console.log("After update - upvote:", complaint.upvote, "downvote:", complaint.downvote, "userVote:", complaint.userVote);
        } else {
          console.error("Could not find complaint with ID:", complaintId);
        }
        
        // Also update selectedComplaint if it matches the voted complaint
        if (state.selectedComplaint && (
          state.selectedComplaint._id === complaintId ||
          state.selectedComplaint._id?.toString() === complaintId?.toString() ||
          state.selectedComplaint.id === complaintId ||
          state.selectedComplaint.id?.toString() === complaintId?.toString()
        )) {
          console.log("Updating selectedComplaint upvotes/downvotes");
          state.selectedComplaint.upvote = upvotes;
          state.selectedComplaint.downvote = downvotes;
          state.selectedComplaint.userVote = userVote;
        }
        
        state.error = null;
      })
      .addCase(downvoteComplaint.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Update complaint status cases
      .addCase(updateComplaintStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(updateComplaintStatus.fulfilled, (state, action) => {
        console.log("Update status fulfilled with payload:", action.payload);
        const { complaintId, status, updatedAt } = action.payload;
        console.log("Looking for complaint with ID:", complaintId, "Type:", typeof complaintId);
        
        // Try different ways to match the complaint ID
        const complaint = state.complaints.find(c => 
          c._id === complaintId || 
          c._id?.toString() === complaintId?.toString() ||
          c.id === complaintId ||
          c.id?.toString() === complaintId?.toString()
        );
        
        console.log("Found complaint for status update:", complaint);
        
        if (complaint) {
          console.log("Before update - status:", complaint.status);
          complaint.status = status;
          complaint.updatedAt = updatedAt;
          console.log("After update - status:", complaint.status);
        } else {
          console.error("Could not find complaint with ID:", complaintId);
        }
        
        // Also update selectedComplaint if it matches the updated complaint
        if (state.selectedComplaint && (
          state.selectedComplaint._id === complaintId ||
          state.selectedComplaint._id?.toString() === complaintId?.toString() ||
          state.selectedComplaint.id === complaintId ||
          state.selectedComplaint.id?.toString() === complaintId?.toString()
        )) {
          console.log("Updating selectedComplaint status");
          state.selectedComplaint.status = status;
          state.selectedComplaint.updatedAt = updatedAt;
        }
        
        state.error = null;
      })
      .addCase(updateComplaintStatus.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete complaint cases
      .addCase(deleteComplaint.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteComplaint.fulfilled, (state, action) => {
        console.log("Delete complaint fulfilled with payload:", action.payload);
        const { complaintId } = action.payload;
        
        // Remove the complaint from the state
        state.complaints = state.complaints.filter(complaint => 
          complaint._id !== complaintId && 
          complaint._id?.toString() !== complaintId?.toString() &&
          complaint.id !== complaintId &&
          complaint.id?.toString() !== complaintId?.toString()
        );
        
        console.log("Complaint deleted from state. Remaining complaints:", state.complaints.length);
        state.error = null;
      })
      .addCase(deleteComplaint.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Add comment cases
      .addCase(addComment.pending, (state) => {
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const { complaintId, comment } = action.payload;
        
        // Find and update the complaint with the new comment
        const complaintIndex = state.complaints.findIndex(
          complaint => 
            complaint._id?.toString() === complaintId?.toString() ||
            complaint.id === complaintId ||
            complaint.id?.toString() === complaintId?.toString()
        );
        
        if (complaintIndex !== -1) {
          if (!state.complaints[complaintIndex].comments) {
            state.complaints[complaintIndex].comments = [];
          }
          state.complaints[complaintIndex].comments.push(comment);
        }
        
        // Also update selectedComplaint if it matches
        if (state.selectedComplaint && (
          state.selectedComplaint._id?.toString() === complaintId?.toString() ||
          state.selectedComplaint.id === complaintId ||
          state.selectedComplaint.id?.toString() === complaintId?.toString()
        )) {
          if (!state.selectedComplaint.comments) {
            state.selectedComplaint.comments = [];
          }
          state.selectedComplaint.comments.push(comment);
          state.selectedComplaint.commentCount = state.selectedComplaint.comments.length;
        }
        
        state.error = null;
      })
      .addCase(addComment.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Fetch comments cases
      .addCase(fetchComments.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        console.log("Fetch comments fulfilled with payload:", action.payload);
        const { complaintId, comments } = action.payload;
        
        // Find the complaint and update its comments
        const complaintIndex = state.complaints.findIndex(complaint => 
          complaint._id === complaintId || 
          complaint._id?.toString() === complaintId?.toString() ||
          complaint.id === complaintId ||
          complaint.id?.toString() === complaintId?.toString()
        );
        
        if (complaintIndex !== -1) {
          // Update the comments for this complaint
          state.complaints[complaintIndex].comments = comments;
          console.log(`Updated comments for complaint ${complaintId}:`, comments);
        } else {
          console.log(`Complaint not found in state for ID: ${complaintId}`);
        }
        
        // Also update selectedComplaint if it matches the complaint with new comments
        if (state.selectedComplaint && (
          state.selectedComplaint._id === complaintId ||
          state.selectedComplaint._id?.toString() === complaintId?.toString() ||
          state.selectedComplaint.id === complaintId ||
          state.selectedComplaint.id?.toString() === complaintId?.toString()
        )) {
          console.log("Updating selectedComplaint comments");
          state.selectedComplaint.comments = comments;
          state.selectedComplaint.commentCount = comments.length;
        }
        
        state.error = null;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        console.error("Fetch comments failed:", action.payload);
        state.error = action.payload;
      })
      // Update comment cases
      .addCase(updateComment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        console.log("Update comment fulfilled with payload:", action.payload);
        state.isLoading = false;
        state.error = null;
        // Note: We'll refresh comments after update, so no need to update state here
      })
      .addCase(updateComment.rejected, (state, action) => {
        console.error("Update comment failed:", action.payload);
        state.isLoading = false;
        state.error = action.payload;
      })
      // Remove comment cases
      .addCase(removeComment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeComment.fulfilled, (state, action) => {
        console.log("Remove comment fulfilled with payload:", action.payload);
        state.isLoading = false;
        state.error = null;
        // Note: We'll refresh comments after deletion, so no need to update state here
      })
      .addCase(removeComment.rejected, (state, action) => {
        console.error("Remove comment failed:", action.payload);
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSuccess, clearError, resetComplaintState } = complaintSlice.actions;
export default complaintSlice.reducer;
