import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from "../../api/axiosInstance";

// Load initial state from AsyncStorage (will be loaded asynchronously)
const initialState = {
  isAuthenticated: false,
  user: null as any,
  token: null as string | null,
  loading: false,
  error: null as string | null,
  initialized: false, // Track if auth has been initialized
};

// 👇 Thunk to initialize auth state from AsyncStorage on app start
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, thunkAPI) => {
    try {
      console.log("Initializing auth state from AsyncStorage...");
      const token = await AsyncStorage.getItem('token');
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      
      if (!token || isLoggedIn !== 'true') {
        console.log("No valid token found in AsyncStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      console.log("Token found, fetching user data from /users/me");
      const res = await axiosInstance.get('/users/me');
      console.log("Initialize auth API response:", res.data);
      
      const userData = res.data.data;
      console.log("User data loaded:", userData);
      
      return { user: userData, token };
    } catch (error: any) {
      console.error("Initialize auth error:", error);
      // Clear invalid token
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('isLoggedIn');
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to initialize auth';
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// 👇 Thunk to load user
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, thunkAPI) => {
    try {
      console.log("Making API call to load user...");
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in AsyncStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

      console.log("Token found, making request to /users/me");
      const res = await axiosInstance.get('/users/me');
      console.log("Load user API response:", res.data);
      
      const userData = res.data.data;
      console.log("Extracted user data:", userData);
      
      return userData;
    } catch (error: any) {
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

// 👇 Thunk to login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, thunkAPI) => {
    try {
      console.log("Making API call to login user...");
      
      const loginData = { email, password };
      
      const res = await axiosInstance.post('/users/login', loginData);
      console.log("Login user API response:", res.data);
      
      return res.data;
    } catch (error: any) {
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

// 👇 Thunk to register user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (formData: FormData, thunkAPI) => {
    try {
      console.log("Making API call to register user...");
      
      const res = await axiosInstance.post('/users/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log("Register user API response:", res.data);
      
      return res.data;
    } catch (error: any) {
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

// 👇 Thunk to update user profile
export const updateUser = createAsyncThunk(
  'auth/updateUser',
  async (updateData: any, thunkAPI) => {
    try {
      console.log("Making API call to update user...", updateData);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log("No token found in AsyncStorage");
        return thunkAPI.rejectWithValue('No authentication token found');
      }

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
      
      const userData = res.data.data;
      console.log("Updated user data:", userData);
      
      return userData;
    } catch (error: any) {
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

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, token } = action.payload || {};
      state.isAuthenticated = !!user;
      state.user = user || null;
      state.token = token || null;
      
      // Persist to AsyncStorage
      if (user && token) {
        AsyncStorage.setItem("isLoggedIn", "true");
        AsyncStorage.setItem('token', token);
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      
      // Remove from AsyncStorage
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('isLoggedIn');
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      
      if (action.payload) {
        AsyncStorage.setItem('isLoggedIn', 'true');
      } else {
        AsyncStorage.setItem('isLoggedIn', 'false');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth state
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        console.log("Auth initialized successfully");
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
        console.log("Auth initialization failed, user needs to login");
      })
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        if (state.token) {
          state.isAuthenticated = true;
        }
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        AsyncStorage.setItem('isLoggedIn', 'true');
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
        AsyncStorage.removeItem('token');
        AsyncStorage.removeItem('isLoggedIn');
      })
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        const { user, accessToken } = action.payload?.data || {};
        if (user && accessToken) {
          state.isAuthenticated = true;
          state.user = user;
          state.token = accessToken;
          AsyncStorage.setItem('token', accessToken);
          AsyncStorage.setItem('isLoggedIn', 'true');
        }
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
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
        state.error = action.payload as string;
      })
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { loginSuccess, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
