import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Location {
  latitude: number | null;
  longitude: number | null;
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
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  category_data_id?: string;
  createdAt: string;
  updatedAt: string;
  user?: any;
  upvotes?: number;
  downvotes?: number;
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

interface ComplaintState {
  complaints: Complaint[];
  userComplaints: Complaint[];
  selectedComplaint: Complaint | null;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  lastSubmittedComplaint: Complaint | null;
}

const initialState: ComplaintState = {
  complaints: [],
  userComplaints: [],
  selectedComplaint: null,
  isSubmitting: false,
  isLoading: false,
  error: null,
  success: false,
  lastSubmittedComplaint: null,
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
      formData.append('complaintId', complaintId);
      formData.append('evidenceType', evidenceType);
      formData.append('description', description);
      formData.append('category', category);

      const response = await axiosInstance.post('/evidence/upload', formData, {
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
      })
      .addCase(submitComplaint.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // Get user complaints
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

    // Upload evidence
    builder
      .addCase(uploadEvidence.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearSuccess, clearError, setSelectedComplaint, resetComplaintState } =
  complaintSlice.actions;

export default complaintSlice.reducer;
