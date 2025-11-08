import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
    notifications: [],
    isLoading: false,
    error: null,
    unreadCount: 0,
};

// Thunk to fetch user notifications
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (_, thunkAPI) => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                return thunkAPI.rejectWithValue('Authentication required. Please log in.');
            }

            console.log('Fetching user notifications...');
            
            const response = await axiosInstance.get('/users/notifications');

            console.log("Notifications API response:", response.data);
            
            return response.data.data || [];
        } catch (error) {
            console.error("Fetch notifications API error:", error);
            
            let errorMessage = 'Failed to fetch notifications. Please try again.';
            
            if (error.response) {
                errorMessage = error.response.data?.message || errorMessage;
            } else if (error.request) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            return thunkAPI.rejectWithValue(errorMessage);
        }
    }
);

// Thunk to delete a notification
export const deleteNotification = createAsyncThunk(
    'notifications/deleteNotification',
    async (index, thunkAPI) => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                return thunkAPI.rejectWithValue('Authentication required. Please log in.');
            }

            console.log(`Deleting notification at index: ${index}`);
            
            const response = await axiosInstance.delete(`/users/notifications/${index}`);

            console.log("Delete notification API response:", response.data);
            
            return { index, ...response.data };
        } catch (error) {
            console.error("Delete notification API error:", error);
            
            let errorMessage = 'Failed to delete notification. Please try again.';
            
            if (error.response) {
                errorMessage = error.response.data?.message || errorMessage;
            } else if (error.request) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            return thunkAPI.rejectWithValue(errorMessage);
        }
    }
);

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        clearNotificationError: (state) => {
            state.error = null;
        },
        markNotificationAsRead: (state, action) => {
            const index = action.payload;
            if (state.notifications[index]) {
                state.notifications[index].read = true;
                state.unreadCount = state.notifications.filter(n => !n.read).length;
            }
        },
        clearAllNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading = false;
                state.notifications = action.payload;
                state.unreadCount = action.payload.filter(n => !n.read).length;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Failed to fetch notifications';
            })
            // Delete notification
            .addCase(deleteNotification.pending, (state) => {
                state.error = null;
            })
            .addCase(deleteNotification.fulfilled, (state, action) => {
                const { index } = action.payload;
                state.notifications.splice(index, 1);
                state.unreadCount = state.notifications.filter(n => !n.read).length;
            })
            .addCase(deleteNotification.rejected, (state, action) => {
                state.error = action.payload || 'Failed to delete notification';
            });
    },
});

export const { clearNotificationError, markNotificationAsRead, clearAllNotifications } = notificationSlice.actions;

export default notificationSlice.reducer;
