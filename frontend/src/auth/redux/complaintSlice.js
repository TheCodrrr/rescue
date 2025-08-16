import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  complaints: [],
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
      console.log("Making API call to submit complaint...", complaintData);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('Authentication required. Please log in to submit a complaint.');
      }

      // Prepare complaint data for backend
      const formattedComplaintData = {
        title: complaintData.title,
        description: complaintData.description,
        category: complaintData.category,
        location: {
          latitude: complaintData.location.latitude,
          longitude: complaintData.location.longitude,
        },
        address: complaintData.location.address || null,
        status: 'pending', // Default status
        timestamp: new Date().toISOString()
      };

      console.log("Formatted complaint data:", formattedComplaintData);
      console.log("Token found, making request to submit complaint");
      
      const response = await axiosInstance.post('/complaints/create', formattedComplaintData);
      console.log("Submit complaint API response:", response.data);
      
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
      
      const payload = {
        complaintId,
        upvotes: Number(upvotes),
        downvotes: Number(downvotes)
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
      
      const payload = {
        complaintId,
        upvotes: Number(upvotes),
        downvotes: Number(downvotes)
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
  async ({ complaintId, content }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in to add a comment.');
      }

      console.log(`Adding comment to complaint ${complaintId}`);
      
      const response = await axiosInstance.post(`/complaints/${complaintId}/comments`, {
        content
      });
      
      console.log("Add comment API response:", response.data);
      
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
      // Upvote complaint cases
      .addCase(upvoteComplaint.pending, (state) => {
        state.error = null;
      })
      .addCase(upvoteComplaint.fulfilled, (state, action) => {
        console.log("Upvote fulfilled with payload:", action.payload);
        const { complaintId, upvotes, downvotes } = action.payload;
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
          console.log("After update - upvote:", complaint.upvote, "downvote:", complaint.downvote);
        } else {
          console.error("Could not find complaint with ID:", complaintId);
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
        const { complaintId, upvotes, downvotes } = action.payload;
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
          console.log("After update - upvote:", complaint.upvote, "downvote:", complaint.downvote);
        } else {
          console.error("Could not find complaint with ID:", complaintId);
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
        
        state.error = null;
      })
      .addCase(addComment.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearSuccess, clearError, resetComplaintState } = complaintSlice.actions;
export default complaintSlice.reducer;
