import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

// Initial state
const initialState = {
    histories: [],
    loading: false,
    error: null,
    filters: {
        actionType: 'all',
        category: 'all',
        sortOrder: 'desc'
    },
    lastFetch: null
};

// Async thunk to fetch user history
export const fetchUserHistory = createAsyncThunk(
    'history/fetchUserHistory',
    async ({ userId, filters = {} }, thunkAPI) => {
        try {
            const params = new URLSearchParams();
            if (userId) params.append('user_id', userId);
            if (filters.actionType && filters.actionType !== 'all') {
                params.append('actionType', filters.actionType);
            }
            if (filters.category && filters.category !== 'all') {
                params.append('category', filters.category);
            }
            params.append('sort', filters.sortOrder || 'desc');
            params.append('limit', '50');

            // console.log('Fetching history with params:', params.toString());
            const response = await axiosInstance.get(`/history?${params.toString()}`);
            
            if (response.data && response.data.histories) {
                return response.data.histories;
            }
            return [];
        } catch (error) {
            console.error('Error fetching history:', error);
            const errorMessage = error.response?.data?.message || 'Failed to fetch history';
            return thunkAPI.rejectWithValue(errorMessage);
        }
    }
);

// Async thunk to add history entry
export const addHistoryEntry = createAsyncThunk(
    'history/addHistoryEntry',
    async (historyData, thunkAPI) => {
        try {
            // console.log('Adding history entry:', historyData);
            const response = await axiosInstance.post('/history', historyData);
            return response.data.history;
        } catch (error) {
            console.error('Error adding history entry:', error);
            const errorMessage = error.response?.data?.message || 'Failed to add history entry';
            // Don't reject, just log error to prevent breaking main functionality
            console.warn('History entry failed but continuing:', errorMessage);
            return null;
        }
    }
);

// Helper async thunks for specific history actions
export const addComplaintRegisteredHistory = createAsyncThunk(
    'history/addComplaintRegistered',
    async ({ userId, complaintId, complaintDetails }, thunkAPI) => {
        const historyData = {
            user_id: userId,
            actionType: 'COMPLAINT_REGISTERED',
            complaint_id: complaintId,
            category: complaintDetails.category,
            details: {
                title: complaintDetails.title,
                category: complaintDetails.category,
                severity: complaintDetails.severity,
                location: complaintDetails.address
            }
        };
        return thunkAPI.dispatch(addHistoryEntry(historyData));
    }
);

export const addComplaintStatusUpdatedHistory = createAsyncThunk(
    'history/addComplaintStatusUpdated',
    async ({ userId, complaintId, previousStatus, newStatus, category }, thunkAPI) => {
        const historyData = {
            user_id: userId,
            actionType: 'COMPLAINT_STATUS_UPDATED',
            complaint_id: complaintId,
            category: category,
            previous_state: { status: previousStatus },
            new_state: { status: newStatus },
            details: {
                statusChange: `${previousStatus} → ${newStatus}`
            }
        };
        return thunkAPI.dispatch(addHistoryEntry(historyData));
    }
);

export const addComplaintVoteHistory = createAsyncThunk(
    'history/addComplaintVote',
    async ({ userId, complaintId, category, voteType }, thunkAPI) => {
        const historyData = {
            user_id: userId,
            actionType: voteType === 'upvote' ? 'COMPLAINT_UPVOTED' : 'COMPLAINT_DOWNVOTED',
            complaint_id: complaintId,
            category: category,
            details: {
                action: voteType
            }
        };
        return thunkAPI.dispatch(addHistoryEntry(historyData));
    }
);

export const addCommentHistory = createAsyncThunk(
    'history/addComment',
    async ({ userId, complaintId, commentId, commentText, category, actionType, previousText = null }, thunkAPI) => {
        const historyData = {
            user_id: userId,
            actionType: actionType, // 'COMMENT_ADDED', 'COMMENT_EDITED', 'COMMENT_DELETED'
            complaint_id: complaintId,
            category: category,
            comment_id: commentId,
            details: {
                commentText: commentText,
                action: actionType.toLowerCase().replace('comment_', '') + '_comment'
            }
        };

        if (actionType === 'COMMENT_EDITED' && previousText) {
            historyData.previous_state = { commentText: previousText };
            historyData.new_state = { commentText: commentText };
        }

        if (actionType === 'COMMENT_DELETED') {
            historyData.details.deletedText = commentText;
        }

        return thunkAPI.dispatch(addHistoryEntry(historyData));
    }
);

export const addUserDetailsUpdatedHistory = createAsyncThunk(
    'history/addUserDetailsUpdated',
    async ({ userId, updatedFields, previousData, newData }, thunkAPI) => {
        const historyData = {
            user_id: userId,
            actionType: 'USER_DETAILS_UPDATED',
            previous_state: previousData,
            new_state: newData,
            details: {
                updatedFields: updatedFields,
                action: 'profile_update'
            }
        };
        return thunkAPI.dispatch(addHistoryEntry(historyData));
    }
);

export const addComplaintEscalatedHistory = createAsyncThunk(
    'history/addComplaintEscalated',
    async ({ userId, complaintId, category, fromLevel, toLevel, reason }, thunkAPI) => {
        const historyData = {
            user_id: userId,
            actionType: 'COMPLAINT_ESCALATED',
            complaint_id: complaintId,
            category: category,
            previous_state: { level: fromLevel },
            new_state: { level: toLevel },
            details: {
                escalation: `Level ${fromLevel} → Level ${toLevel}`,
                reason: reason || 'Complaint assigned to officer - Initial escalation'
            }
        };
        return thunkAPI.dispatch(addHistoryEntry(historyData));
    }
);

// History slice
const historySlice = createSlice({
    name: 'history',
    initialState,
    reducers: {
        // Synchronous actions
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearHistory: (state) => {
            state.histories = [];
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch user history
            .addCase(fetchUserHistory.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.histories = action.payload;
                state.lastFetch = new Date().toISOString();
                state.error = null;
            })
            .addCase(fetchUserHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.histories = [];
            })
            // Add history entry
            .addCase(addHistoryEntry.pending, (state) => {
                // Don't set loading for add operations to avoid UI blocking
            })
            .addCase(addHistoryEntry.fulfilled, (state, action) => {
                if (action.payload) {
                    // Add new history entry to the beginning of the array
                    state.histories.unshift(action.payload);
                }
            })
            .addCase(addHistoryEntry.rejected, (state, action) => {
                console.warn('History entry failed:', action.payload);
                // Don't set error state to avoid disrupting user experience
            });
    }
});

// Export actions
export const { setFilters, clearHistory, clearError } = historySlice.actions;

// Export selectors
export const selectHistories = (state) => state.history.histories;
export const selectHistoryLoading = (state) => state.history.loading;
export const selectHistoryError = (state) => state.history.error;
export const selectHistoryFilters = (state) => state.history.filters;
export const selectLastFetch = (state) => state.history.lastFetch;

// Export reducer
export default historySlice.reducer;