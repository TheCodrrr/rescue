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
      });
  },
});

export const { clearOfficerError, updateOfficerLocation, addNewComplaintRealtime } = officerSlice.actions;

export default officerSlice.reducer;
