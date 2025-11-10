import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import axiosInstance from "../../api/axios";

// 👇 Axios instance with credentials support
// const axiosInstance = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
//   withCredentials: true, // Important for sending cookies
// });

// Load initial state from localStorage
const storedToken = localStorage.getItem('token');
const storedIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

const initialState = {
  isAuthenticated: storedIsLoggedIn && !!storedToken,
  user: null, // User data will only be in Redux store, not localStorage
  token: storedToken || null,
  loading: false,
  error: null,
};

// 👇 Thunk to load user
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, thunkAPI) => {
    try {
      console.log("Making API call to load user...");
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      console.log("Token found, making request to /users/me");
      const res = await axiosInstance.get('/users/me');
      console.log("Load user API response:", res.data);
      
      // Extract user data from the correct path based on your API response structure
      // Your API returns: {statusCode: 200, data: {user_data}, message: 'Current user details', success: true}
      const userData = res.data.data;
      console.log("Extracted user data:", userData);
      
      return userData;
    } catch (error) {
      console.error("Load user API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load user';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to update user profile
export const updateUser = createAsyncThunk(
  'auth/updateUser',
  async (updateData, thunkAPI) => {
    try {
      console.log("Making API call to update user...", updateData);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      // Prepare the data for API call
      const profileData = {
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
        address: updateData.address,
        latitude: updateData.latitude,
        longitude: updateData.longitude
      };

      console.log("Token found, making request to update user profile with data:", profileData);
      const res = await axiosInstance.patch('/users/update', profileData);
      console.log("Update user API response:", res.data);
      
      // Extract updated user data from the correct path based on your API response structure
      const userData = res.data.data;
      console.log("Updated user data:", userData);
      
      return userData;
    } catch (error) {
      console.error("Update user API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update user profile';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to upload profile image
export const uploadProfileImage = createAsyncThunk(
  'auth/uploadProfileImage',
  async (imageFile, thunkAPI) => {
    try {
      console.log("Making API call to upload profile image...", imageFile.name);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profileImage', imageFile);

      console.log("Token found, making request to upload profile image");
      console.log("Token being used:", token);
      console.log("FormData contents:", formData.get('profileImage'));
      
      const res = await axiosInstance.patch('/users/update-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("Upload profile image API response:", res.data);
      console.log("Full response object:", res);
      
      // Extract updated user data from the correct path based on your API response structure
      const userData = res.data.data;
      console.log("Updated user data with new profile image:", userData);
      console.log("Old profile image URL:", userData.profileImage);
      console.log("New profile image should be:", userData.profileImage);
      
      // Verify that we actually got a new profile image URL
      if (!userData.profileImage) {
        console.warn("Warning: No profileImage found in response data");
      }
      
      return userData;
    } catch (error) {
      console.error("Upload profile image API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to upload profile image';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to delete user account
export const deleteUser = createAsyncThunk(
  'auth/deleteUser',
  async (_, thunkAPI) => {
    try {
      console.log("Making API call to delete user account...");
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      console.log("Token found, making request to delete user account");
      const res = await axiosInstance.delete('/users/delete');
      console.log("Delete user API response:", res.data);
      
      return res.data;
    } catch (error) {
      console.error("Delete user API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to delete user account';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to change user password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ oldPassword, newPassword }, thunkAPI) => {
    try {
      console.log("Making API call to change password...");
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in localStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      const passwordData = {
        oldPassword,
        newPassword
      };

      console.log("Token found, making request to change password");
      console.log("Password data being sent:", passwordData);
      const res = await axiosInstance.patch('/users/change-password', passwordData);
      console.log("Change password API response:", res.data);
      
      return res.data;
    } catch (error) {
      console.error("Change password API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to change password';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to verify department secret
export const verifyDepartmentSecret = createAsyncThunk(
  'auth/verifyDepartmentSecret',
  async ({ department_id, department_secret }, thunkAPI) => {
    try {
      console.log("Making API call to verify department secret...");
      
      const secretData = {
        department_id,
        department_secret
      };

      console.log("Department secret data being sent:", secretData);
      const res = await axiosInstance.post('/departments/validate-secret', secretData);
      console.log("Verify department secret API response:", res.data);
      
      return res.data;
    } catch (error) {
      console.error("Verify department secret API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to verify department secret';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to register user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (formDataToSend, thunkAPI) => {
    try {
      console.log("Making API call to register user...");
      
      const res = await axiosInstance.post('/users/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log("Register user API response:", res.data);
      
      return res.data;
    } catch (error) {
      console.error("Register user API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to register user';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, thunkAPI) => {
    try {
      console.log("Making API call to login user...");
      
      const loginData = { email, password };
      
      const res = await axiosInstance.post('/users/login', loginData);
      console.log("Login user API response:", res.data);
      
      return res.data;
    } catch (error) {
      console.error("Login user API error:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to login user';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
        const { user, token } = action.payload || {};
        state.isAuthenticated = !!user;
        state.user = user || null; // Store user only in Redux
        state.token = token || null;
        // Persist only token and isLoggedIn to localStorage
        if (user && token) {
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem('token', token);
        }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      // Remove only token and isLoggedIn from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
    },
    setUser: (state, action) => {
      state.user = action.payload; // Store user only in Redux
      state.isAuthenticated = !!action.payload;
      // Update isLoggedIn in localStorage based on user presence
      if (action.payload) {
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        localStorage.setItem('isLoggedIn', 'false');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload; // Store user only in Redux
        state.isAuthenticated = true;
        // Update only isLoggedIn in localStorage
        localStorage.setItem('isLoggedIn', 'true');
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
        // Clear localStorage if user loading fails (token might be invalid)
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
      })
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload; // Update user data in Redux
        state.error = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(uploadProfileImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProfileImage.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload; // Update user data in Redux with new profile image
        state.error = null;
      })
      .addCase(uploadProfileImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteUser.pending, (state) => {
        // Don't set loading to true to avoid UI interference
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state) => {
        // Clear all user data and logout
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.error = null;
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(changePassword.pending, (state) => {
        // Don't set loading to true to avoid UI interference
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        // Password changed successfully - no user data changes needed
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(verifyDepartmentSecret.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyDepartmentSecret.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyDepartmentSecret.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        // Extract user and token from response
        const { user, accessToken } = action.payload?.data || {};
        if (user && accessToken) {
          state.isAuthenticated = true;
          state.user = user;
          state.token = accessToken;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('isLoggedIn', 'true');
        }
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { loginSuccess, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
