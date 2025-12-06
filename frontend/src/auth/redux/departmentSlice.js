import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  departmentDetails: null,
  loading: false,
  error: null,
};

// Thunk to fetch department details by ID
export const fetchDepartmentDetails = createAsyncThunk(
  'department/fetchDetails',
  async (departmentId, thunkAPI) => {
    try {
      console.log("Fetching department details for ID:", departmentId);
      const res = await axiosInstance.get(`/departments/detail/${departmentId}`);
      console.log("Department details API response:", res.data);
      return res.data.data;
    } catch (error) {
      console.error("Department details API error:", error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch department details';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

const departmentSlice = createSlice({
  name: 'department',
  initialState,
  reducers: {
    clearDepartmentDetails: (state) => {
      state.departmentDetails = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartmentDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.departmentDetails = action.payload;
        state.error = null;
      })
      .addCase(fetchDepartmentDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearDepartmentDetails } = departmentSlice.actions;
export default departmentSlice.reducer;
