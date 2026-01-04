import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance for evidence API calls
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Initial state
const initialState = {
  evidenceList: [],
  currentEvidence: null,
  loading: false,
  uploading: false,
  deleting: false,
  error: null,
};

// 👇 Thunk to upload evidence
export const uploadEvidence = createAsyncThunk(
  'evidence/uploadEvidence',
  async ({ file, complaintId, evidenceType, description, category }, thunkAPI) => {
    try {
      // console.log("Making API call to upload evidence...", file.name);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('complaint_id', complaintId);
      formData.append('evidence_type', evidenceType);
      formData.append('category', category);
      if (description) {
        formData.append('description', description);
      }

      // console.log("Token found, making request to upload evidence");
      // console.log("FormData contents:", {
        // file: formData.get('file'),
        // complaint_id: formData.get('complaint_id'),
        // evidence_type: formData.get('evidence_type'),
        // category: formData.get('category'),
        // description: formData.get('description'),
      // });
      
      const res = await axiosInstance.post('/evidences', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // console.log("Upload evidence API response:", res.data);
      
      return res.data.data;
    } catch (error) {
      console.error("Upload evidence API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to upload evidence';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to fetch evidence by complaint ID
export const fetchComplaintEvidence = createAsyncThunk(
  'evidence/fetchComplaintEvidence',
  async (complaintId, thunkAPI) => {
    try {
      // console.log("Fetching evidence for complaint:", complaintId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      const res = await axiosInstance.get(`/evidences/complaint/${complaintId}`);
      // console.log("Fetch evidence API response:", res.data);
      
      return res.data.data;
    } catch (error) {
      console.error("Fetch evidence API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to fetch evidence';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to delete evidence
export const deleteEvidence = createAsyncThunk(
  'evidence/deleteEvidence',
  async (evidenceId, thunkAPI) => {
    try {
      // console.log("Deleting evidence:", evidenceId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      const res = await axiosInstance.delete(`/evidences/${evidenceId}`);
      // console.log("Delete evidence API response:", res.data);
      
      return evidenceId; // Return the deleted evidence ID for state update
    } catch (error) {
      console.error("Delete evidence API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to delete evidence';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to fetch user's evidence
export const fetchUserEvidence = createAsyncThunk(
  'evidence/fetchUserEvidence',
  async (userId, thunkAPI) => {
    try {
      // console.log("Fetching evidence for user:", userId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      const res = await axiosInstance.get(`/evidences/user/${userId}`);
      // console.log("Fetch user evidence API response:", res.data);
      
      return res.data.data;
    } catch (error) {
      console.error("Fetch user evidence API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to fetch user evidence';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Create slice
const evidenceSlice = createSlice({
  name: 'evidence',
  initialState,
  reducers: {
    clearEvidenceError: (state) => {
      state.error = null;
    },
    clearEvidenceList: (state) => {
      state.evidenceList = [];
    },
    setCurrentEvidence: (state, action) => {
      state.currentEvidence = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload evidence
      .addCase(uploadEvidence.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadEvidence.fulfilled, (state, action) => {
        state.uploading = false;
        state.evidenceList.unshift(action.payload); // Add new evidence to the beginning
        state.error = null;
      })
      .addCase(uploadEvidence.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })

      // Fetch complaint evidence
      .addCase(fetchComplaintEvidence.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintEvidence.fulfilled, (state, action) => {
        state.loading = false;
        state.evidenceList = action.payload;
        state.error = null;
      })
      .addCase(fetchComplaintEvidence.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete evidence
      .addCase(deleteEvidence.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteEvidence.fulfilled, (state, action) => {
        state.deleting = false;
        state.evidenceList = state.evidenceList.filter(
          (evidence) => evidence._id !== action.payload
        );
        state.error = null;
      })
      .addCase(deleteEvidence.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      })

      // Fetch user evidence
      .addCase(fetchUserEvidence.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserEvidence.fulfilled, (state, action) => {
        state.loading = false;
        state.evidenceList = action.payload;
        state.error = null;
      })
      .addCase(fetchUserEvidence.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearEvidenceError, clearEvidenceList, setCurrentEvidence } = evidenceSlice.actions;

export default evidenceSlice.reducer;
