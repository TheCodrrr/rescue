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

      // console.log(`Fetching nearby complaints for location: lat=${latitude}, lng=${longitude}`);
      
      const response = await axiosInstance.get('/officer/nearby-complaints', {
        params: { latitude, longitude }
      });

      // console.log("Nearby complaints API response:", response.data);
      
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

// Thunk to reject a complaint with reason
export const rejectComplaint = createAsyncThunk(
  'officer/rejectComplaint',
  async ({ complaintId, reason }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!complaintId) {
        return thunkAPI.rejectWithValue('Complaint ID is required');
      }

      if (!reason || reason.trim() === '') {
        return thunkAPI.rejectWithValue('Rejection reason is required');
      }

      // console.log(`Rejecting complaint: ${complaintId} with reason: ${reason}`);
      
      const response = await axiosInstance.post('/officer/reject-complaint', {
        complaintId,
        reason: reason.trim()
      });

      // console.log("Reject complaint API response:", response.data);
      
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

      // console.log(`Accepting complaint: ${complaintId} for officer: ${officerId}`);
      
      const response = await axiosInstance.put(
        `/officer/${officerId}/assign-complaint/${complaintId}`
      );

      // console.log("Accept complaint API response:", response.data);
      
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
  async ({ complaintId, from_level = 1, to_level = 2, reason }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!complaintId) {
        return thunkAPI.rejectWithValue('Complaint ID is required');
      }

      // console.log(`Adding escalation event for complaint: ${complaintId}`);
      
      const response = await axiosInstance.patch(
        `/escalations/${complaintId}/add-event`,
        {
          from_level,
          to_level,
          reason: reason || 'Complaint assigned to officer - Initial escalation'
        }
      );

      // console.log("Add escalation event API response:", response.data);
      
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

// Thunk to resolve a complaint (officer must be handling it)
export const resolveComplaint = createAsyncThunk(
  'officer/resolveComplaint',
  async ({ complaintId, officerNotes }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return thunkAPI.rejectWithValue('Authentication required. Please log in.');
      }

      if (!complaintId) {
        return thunkAPI.rejectWithValue('Complaint ID is required');
      }

      // console.log(`Resolving complaint: ${complaintId}`);
      
      const response = await axiosInstance.put(
        `/officer/resolve-complaint/${complaintId}`,
        { officer_notes: officerNotes || '' }
      );

      // console.log("Resolve complaint API response:", response.data);
      
      return { complaintId, ...response.data };
    } catch (error) {
      console.error("Resolve complaint API error:", error);
      
      let errorMessage = 'Failed to resolve complaint. Please try again.';
      
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
    },
    updateComplaintRealtime: (state, action) => {
      // Update an existing complaint (e.g., when escalated)
      const updatedComplaint = action.payload;
      const complaintId = updatedComplaint._id;
      
      // Find and update in low severity
      const lowIndex = state.nearbyComplaints.low_severity.complaints.findIndex(c => c._id === complaintId);
      if (lowIndex !== -1) {
        state.nearbyComplaints.low_severity.complaints[lowIndex] = updatedComplaint;
        return;
      }
      
      // Find and update in medium severity
      const mediumIndex = state.nearbyComplaints.medium_severity.complaints.findIndex(c => c._id === complaintId);
      if (mediumIndex !== -1) {
        state.nearbyComplaints.medium_severity.complaints[mediumIndex] = updatedComplaint;
        return;
      }
      
      // Find and update in high severity
      const highIndex = state.nearbyComplaints.high_severity.complaints.findIndex(c => c._id === complaintId);
      if (highIndex !== -1) {
        state.nearbyComplaints.high_severity.complaints[highIndex] = updatedComplaint;
        return;
      }
    },
    removeComplaintRealtime: (state, action) => {
      // Remove complaint when it's accepted by another officer
      const complaintId = action.payload;
      
      // Remove from all severity levels
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
      
      // Update total count
      state.totalComplaints = 
        state.nearbyComplaints.low_severity.complaints.length +
        state.nearbyComplaints.medium_severity.complaints.length +
        state.nearbyComplaints.high_severity.complaints.length;
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
        const { complaintId } = action.payload;
        
        // Find which severity level the complaint belongs to and remove it
        const lowBefore = state.nearbyComplaints.low_severity.complaints.length;
        const mediumBefore = state.nearbyComplaints.medium_severity.complaints.length;
        const highBefore = state.nearbyComplaints.high_severity.complaints.length;
        
        // Remove the accepted complaint from all severity levels since it's no longer active
        // (backend sets active: false and filters by active: true)
        state.nearbyComplaints.low_severity.complaints = 
          state.nearbyComplaints.low_severity.complaints.filter(c => c._id !== complaintId);
        state.nearbyComplaints.medium_severity.complaints = 
          state.nearbyComplaints.medium_severity.complaints.filter(c => c._id !== complaintId);
        state.nearbyComplaints.high_severity.complaints = 
          state.nearbyComplaints.high_severity.complaints.filter(c => c._id !== complaintId);
        
        // Update individual counts based on which array changed
        if (state.nearbyComplaints.low_severity.complaints.length < lowBefore) {
          state.nearbyComplaints.low_severity.count = state.nearbyComplaints.low_severity.complaints.length;
        }
        if (state.nearbyComplaints.medium_severity.complaints.length < mediumBefore) {
          state.nearbyComplaints.medium_severity.count = state.nearbyComplaints.medium_severity.complaints.length;
        }
        if (state.nearbyComplaints.high_severity.complaints.length < highBefore) {
          state.nearbyComplaints.high_severity.count = state.nearbyComplaints.high_severity.complaints.length;
        }
        
        // Update total count
        state.totalComplaints = 
          state.nearbyComplaints.low_severity.complaints.length +
          state.nearbyComplaints.medium_severity.complaints.length +
          state.nearbyComplaints.high_severity.complaints.length;
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
        // console.log('Escalation event added:', action.payload);
      })
      .addCase(addEscalationEvent.rejected, (state, action) => {
        state.error = action.payload || 'Failed to add escalation event';
      })
      // Resolve complaint
      .addCase(resolveComplaint.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resolveComplaint.fulfilled, (state, action) => {
        state.isLoading = false;
        // console.log('Complaint resolved:', action.payload);
      })
      .addCase(resolveComplaint.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to resolve complaint';
      });
  },
});

export const { clearOfficerError, updateOfficerLocation, addNewComplaintRealtime, updateComplaintRealtime, removeComplaintRealtime } = officerSlice.actions;

export default officerSlice.reducer;
