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
      });
  },
});

export const { clearSuccess, clearError, resetComplaintState } = complaintSlice.actions;
export default complaintSlice.reducer;
