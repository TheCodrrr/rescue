import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
    data: null,
    isLoading: false,
    error: null,
};

// Thunk to fetch analytics data
export const fetchAnalytics = createAsyncThunk(
    'analytics/fetch',
    async (_, thunkAPI) => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                return thunkAPI.rejectWithValue('Authentication required. Please log in to view analytics.');
            }

            const response = await axiosInstance.get('/analytics/detail');
            return response.data.data;
        } catch (error) {
            console.error("Fetch analytics API error:", error);
            
            let errorMessage = 'Failed to fetch analytics data. Please try again.';
            
            if (error.response) {
                errorMessage = error.response.data?.message || 
                               error.response.data?.error || 
                               `Server error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            return thunkAPI.rejectWithValue(errorMessage);
        }
    }
);

const analyticsSlice = createSlice({
    name: 'analytics',
    initialState,
    reducers: {
        clearAnalytics: (state) => {
            state.data = null;
            state.error = null;
        },
        clearAnalyticsError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAnalytics.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAnalytics.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload;
                state.error = null;
            })
            .addCase(fetchAnalytics.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Failed to fetch analytics';
            });
    }
});

export const { clearAnalytics, clearAnalyticsError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
