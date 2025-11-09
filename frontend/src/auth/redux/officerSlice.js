import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  nearbyComplaints: {
    low_severity: { radius_km: 10, count: 0, complaints: [] },
    medium_severity: { radius_km: 20, count: 0, complaints: [] },
    high_severity: { radius_km: 100, count: 0, complaints: [] }
  },
  totalComplaints: 0,
  officerLocation: { latitude: null, longitude: null },
  timestamp: null,
  isLoading: false,
  error: null,
};

// Thunk to fetch nearby complaints for officer
export const fetchNearbyComplaints = createAsyncThunk(
  'officer/fetchNearbyComplaints',
  async ({ latitude, longitude }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!latitude || !longitude) {
        return thunkAPI.rejectWithValue('Location coordinates are required');
      }

      console.log(`Fetching nearby complaints for location: lat=${latitude}, lng=${longitude}`);
      
      const response = await axiosInstance.get('/officer/nearby-complaints', {
        params: { latitude, longitude }
      });

      console.log("Nearby complaints API response:", response.data);
      
      return response.data;
    } catch (error) {
      console.error("Fetch nearby complaints API error:", error);
      
      let errorMessage = 'Failed to fetch nearby complaints. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Thunk to reject/ignore a complaint
export const rejectComplaint = createAsyncThunk(
  'officer/rejectComplaint',
  async (complaintId, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!complaintId) {
        return thunkAPI.rejectWithValue('Complaint ID is required');
      }

      console.log(`Rejecting complaint: ${complaintId}`);
      
      const response = await axiosInstance.post('/officer/reject-complaint', {
        complaintId
      });

      console.log("Reject complaint API response:", response.data);
      
      return { complaintId, ...response.data };
    } catch (error) {
      console.error("Reject complaint API error:", error);
      
      let errorMessage = 'Failed to reject complaint. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Thunk to accept/assign a complaint to officer
export const acceptComplaint = createAsyncThunk(
  'officer/acceptComplaint',
  async ({ complaintId, officerId }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!complaintId || !officerId) {
        return thunkAPI.rejectWithValue('Complaint ID and Officer ID are required');
      }

      console.log(`Accepting complaint: ${complaintId} for officer: ${officerId}`);
      
      const response = await axiosInstance.put(
        `/officer/${officerId}/assign-complaint/${complaintId}`
      );

      console.log("Accept complaint API response:", response.data);
      
      return { complaintId, ...response.data };
    } catch (error) {
      console.error("Accept complaint API error:", error);
      
      let errorMessage = 'Failed to accept complaint. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Thunk to add escalation event
export const addEscalationEvent = createAsyncThunk(
  'officer/addEscalationEvent',
  async ({ complaintId, from_level = 0, to_level = 1, reason }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!complaintId) {
        return thunkAPI.rejectWithValue('Complaint ID is required');
      }

      console.log(`Adding escalation event for complaint: ${complaintId}`);
      
      const response = await axiosInstance.patch(
        `/escalations/${complaintId}/add-event`,
        {
          from_level,
          to_level,
          reason: reason || 'Complaint assigned to officer - Initial escalation'
        }
      );

      console.log("Add escalation event API response:", response.data);
      
      return { complaintId, ...response.data };
    } catch (error) {
      console.error("Add escalation event API error:", error);
      
      let errorMessage = 'Failed to add escalation event. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

const officerSlice = createSlice({
  name: 'officer',
  initialState,
  reducers: {
    clearOfficerError: (state) => {
      state.error = null;
    },
    updateOfficerLocation: (state, action) => {
      state.officerLocation = action.payload;
    },
    addNewComplaintRealtime: (state, action) => {
      // Add new complaint from socket.io in real-time
      const newComplaint = action.payload;
      const severity = newComplaint.severity;
      
      // Check if complaint already exists in any severity level
      const existsInLow = state.nearbyComplaints.low_severity.complaints.some(c => c._id === newComplaint._id);
      const existsInMedium = state.nearbyComplaints.medium_severity.complaints.some(c => c._id === newComplaint._id);
      const existsInHigh = state.nearbyComplaints.high_severity.complaints.some(c => c._id === newComplaint._id);
      
      // Only add if complaint doesn't already exist
      if (!existsInLow && !existsInMedium && !existsInHigh) {
        if (severity === 'low') {
          state.nearbyComplaints.low_severity.complaints.unshift(newComplaint);
          state.nearbyComplaints.low_severity.count++;
        } else if (severity === 'medium') {
          state.nearbyComplaints.medium_severity.complaints.unshift(newComplaint);
          state.nearbyComplaints.medium_severity.count++;
        } else if (severity === 'high') {
          state.nearbyComplaints.high_severity.complaints.unshift(newComplaint);
          state.nearbyComplaints.high_severity.count++;
        }
        
        state.totalComplaints++;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch nearby complaints
      .addCase(fetchNearbyComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNearbyComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearbyComplaints = action.payload.data;
        state.totalComplaints = action.payload.total_complaints;
        state.officerLocation = action.payload.officer_location;
        state.timestamp = action.payload.timestamp;
      })
      .addCase(fetchNearbyComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch nearby complaints';
      })
      // Reject complaint
      .addCase(rejectComplaint.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectComplaint.fulfilled, (state, action) => {
        state.isLoading = false;
        const { complaintId } = action.payload;
        
        // Remove complaint from all severity levels
        state.nearbyComplaints.low_severity.complaints = 
          state.nearbyComplaints.low_severity.complaints.filter(c => c._id !== complaintId);
        state.nearbyComplaints.medium_severity.complaints = 
          state.nearbyComplaints.medium_severity.complaints.filter(c => c._id !== complaintId);
        state.nearbyComplaints.high_severity.complaints = 
          state.nearbyComplaints.high_severity.complaints.filter(c => c._id !== complaintId);
        
        // Update counts
        state.nearbyComplaints.low_severity.count = state.nearbyComplaints.low_severity.complaints.length;
        state.nearbyComplaints.medium_severity.count = state.nearbyComplaints.medium_severity.complaints.length;
        state.nearbyComplaints.high_severity.count = state.nearbyComplaints.high_severity.complaints.length;
        state.totalComplaints--;
      })
      .addCase(rejectComplaint.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to reject complaint';
      })
      // Accept complaint
      .addCase(acceptComplaint.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(acceptComplaint.fulfilled, (state, action) => {
        state.isLoading = false;
        const { complaintId, complaint: updatedComplaint } = action.payload;
        
        // Update complaint's assigned_officer_id and status in all severity levels
        const updateComplaint = (complaint) => {
          if (complaint._id === complaintId) {
            return { 
              ...complaint, 
              assigned_officer_id: updatedComplaint?.assigned_officer_id,
              status: updatedComplaint?.status || 'in_progress' // Update status to in_progress
            };
          }
          return complaint;
        };
        
        state.nearbyComplaints.low_severity.complaints = 
          state.nearbyComplaints.low_severity.complaints.map(updateComplaint);
        state.nearbyComplaints.medium_severity.complaints = 
          state.nearbyComplaints.medium_severity.complaints.map(updateComplaint);
        state.nearbyComplaints.high_severity.complaints = 
          state.nearbyComplaints.high_severity.complaints.map(updateComplaint);
      })
      .addCase(acceptComplaint.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to accept complaint';
      })
      // Add escalation event
      .addCase(addEscalationEvent.pending, (state) => {
        state.error = null;
      })
      .addCase(addEscalationEvent.fulfilled, (state, action) => {
        // Escalation event added successfully
        console.log('Escalation event added:', action.payload);
      })
      .addCase(addEscalationEvent.rejected, (state, action) => {
        state.error = action.payload || 'Failed to add escalation event';
      });
  },
});

export const { clearOfficerError, updateOfficerLocation, addNewComplaintRealtime } = officerSlice.actions;

export default officerSlice.reducer;
