import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    fetchUserHistory, 
    setFilters, 
    clearError,
    selectHistories,
    selectHistoryLoading,
    selectHistoryError,
    selectHistoryFilters
} from './auth/redux/historySlice';
import { 
    Clock, 
    FileText, 
    ThumbsUp, 
    ThumbsDown, 
    MessageSquare, 
    Edit3, 
    Trash2, 
    User, 
    RefreshCw,
    Filter,
    Calendar,
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import './UserHistory.css';

const UserHistory = () => {
    const [refreshing, setRefreshing] = useState(false);
    
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const histories = useSelector(selectHistories);
    const loading = useSelector(selectHistoryLoading);
    const error = useSelector(selectHistoryError);
    const filters = useSelector(selectHistoryFilters);

    // Action type configurations
    const actionTypeConfig = {
        COMPLAINT_REGISTERED: {
            icon: FileText,
            color: '#4CAF50',
            label: 'Complaint Registered',
            description: 'New complaint was filed'
        },
        COMPLAINT_STATUS_UPDATED: {
            icon: RefreshCw,
            color: '#FF9800',
            label: 'Status Updated',
            description: 'Complaint status was changed'
        },
        COMPLAINT_UPVOTED: {
            icon: ThumbsUp,
            color: '#2196F3',
            label: 'Upvoted',
            description: 'Gave support to a complaint'
        },
        COMPLAINT_DOWNVOTED: {
            icon: ThumbsDown,
            color: '#f44336',
            label: 'Downvoted',
            description: 'Disagreed with a complaint'
        },
        COMMENT_ADDED: {
            icon: MessageSquare,
            color: '#9c27b0',
            label: 'Comment Added',
            description: 'Posted a new comment'
        },
        COMMENT_EDITED: {
            icon: Edit3,
            color: '#ff5722',
            label: 'Comment Edited',
            description: 'Modified an existing comment'
        },
        COMMENT_DELETED: {
            icon: Trash2,
            color: '#795548',
            label: 'Comment Deleted',
            description: 'Removed a comment'
        },
        USER_DETAILS_UPDATED: {
            icon: User,
            color: '#607d8b',
            label: 'Profile Updated',
            description: 'Updated profile information'
        }
    };

    // Category configurations
    const categoryConfig = {
        rail: { color: '#1976d2', label: 'Railway' },
        road: { color: '#388e3c', label: 'Road' },
        fire: { color: '#d32f2f', label: 'Fire' },
        cyber: { color: '#7b1fa2', label: 'Cyber Crime' },
        police: { color: '#303f9f', label: 'Police' },
        court: { color: '#f57c00', label: 'Court' }
    };

    const fetchHistory = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        
        if (user?._id) {
            await dispatch(fetchUserHistory({ 
                userId: user._id, 
                filters: filters
            }));
        }
        
        if (showRefresh) setRefreshing(false);
    }, [user?._id, filters, dispatch]);

    useEffect(() => {
        if (user?._id) {
            fetchHistory();
        }
    }, [fetchHistory]);

    const handleRefresh = useCallback(() => {
        fetchHistory(true);
    }, [fetchHistory]);

    const handleFilterChange = useCallback((filterType, value) => {
        dispatch(setFilters({ [filterType]: value }));
    }, [dispatch]);

    const getActionIcon = (actionType) => {
        const config = actionTypeConfig[actionType];
        if (!config) return Activity;
        return config.icon;
    };

    const getActionColor = (actionType) => {
        const config = actionTypeConfig[actionType];
        return config?.color || '#666';
    };

    const getActionLabel = (actionType) => {
        const config = actionTypeConfig[actionType];
        return config?.label || actionType.replace(/_/g, ' ');
    };

    const getActionDescription = (actionType) => {
        const config = actionTypeConfig[actionType];
        return config?.description || 'Action performed';
    };

    const getCategoryLabel = (category) => {
        return categoryConfig[category]?.label || category;
    };

    const getCategoryColor = (category) => {
        return categoryConfig[category]?.color || '#666';
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            return `${diffInMinutes} minutes ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`;
        } else if (diffInHours < 168) { // 7 days
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const renderHistoryDetails = (history) => {
        const details = history.details || {};
        
        switch (history.actionType) {
            case 'COMPLAINT_REGISTERED':
                return (
                    <div className="history-details">
                        {details.title && <p><strong>Title:</strong> {details.title}</p>}
                        {details.category && <p><strong>Category:</strong> {getCategoryLabel(details.category)}</p>}
                    </div>
                );
            
            case 'COMPLAINT_STATUS_UPDATED':
                return (
                    <div className="history-details">
                        {history.previous_state?.status && history.new_state?.status && (
                            <div className="status-change">
                                <span className="status-from">{history.previous_state.status}</span>
                                <span className="status-arrow">→</span>
                                <span className="status-to">{history.new_state.status}</span>
                            </div>
                        )}
                    </div>
                );
            
            case 'COMMENT_ADDED':
            case 'COMMENT_EDITED':
                return (
                    <div className="history-details">
                        {details.commentText && (
                            <p className="comment-text">"{details.commentText.substring(0, 100)}..."</p>
                        )}
                    </div>
                );
            
            case 'USER_DETAILS_UPDATED':
                return (
                    <div className="history-details">
                        {details.updatedFields && (
                            <p><strong>Updated:</strong> {details.updatedFields.join(', ')}</p>
                        )}
                    </div>
                );
            
            default:
                return null;
        }
    };

    // Memoized header component - won't re-render unless refreshing state changes
    const headerComponent = useMemo(() => (
        <div className="history-header">
            <div className="header-content">
                <div className="header-text">
                    <h2 className="history-title">
                        <Clock className="title-icon" />
                        Activity History
                    </h2>
                    <p className="history-subtitle">
                        Track all your actions and interactions within the system
                    </p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                    disabled={refreshing}
                >
                    <RefreshCw className={`refresh-icon ${refreshing ? 'spinning' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Filters */}
            <div className="history-filters">
                <div className="filter-group">
                    <label htmlFor="actionFilter">
                        <Filter size={16} />
                        Action Type
                    </label>
                    <select 
                        id="actionFilter"
                        value={filters.actionType} 
                        onChange={(e) => handleFilterChange('actionType', e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Actions</option>
                        {Object.entries(actionTypeConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="categoryFilter">
                        <Activity size={16} />
                        Category
                    </label>
                    <select 
                        id="categoryFilter"
                        value={filters.category} 
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Categories</option>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="sortOrder">
                        <Calendar size={16} />
                        Sort By
                    </label>
                    <select 
                        id="sortOrder"
                        value={filters.sortOrder} 
                        onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                        className="filter-select"
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>
        </div>
    ), [refreshing, filters, handleRefresh, handleFilterChange]);

    // Memoized content component - will only re-render when histories, loading, or error changes
    const contentComponent = useMemo(() => {
        if (loading) {
            return (
                <div className="history-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your history...</p>
                </div>
            );
        }

        return (
            <div className="history-content">
                {histories.length === 0 ? (
                    <div className="history-empty">
                        <Activity className="empty-icon" />
                        <h3>No History Found</h3>
                        <p>
                            {filters.actionType !== 'all' || filters.category !== 'all' 
                                ? 'No activities match your current filters. Try adjusting them to see more results.'
                                : 'You haven\'t performed any actions yet. Start by filing a complaint or interacting with the system!'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="history-timeline">
                        {histories.map((history, index) => {
                            const ActionIcon = getActionIcon(history.actionType);
                            const actionColor = getActionColor(history.actionType);
                            
                            return (
                                <div key={history._id} className="history-item" style={{'--delay': `${index * 0.1}s`}}>
                                    <div className="history-marker">
                                        <div 
                                            className="marker-icon"
                                            style={{ backgroundColor: actionColor }}
                                        >
                                            <ActionIcon size={16} />
                                        </div>
                                        {index < histories.length - 1 && <div className="marker-line"></div>}
                                    </div>
                                    
                                    <div className="history-card">
                                        <div className="card-header">
                                            <div className="action-info">
                                                <h4 className="action-title">
                                                    {getActionLabel(history.actionType)}
                                                </h4>
                                                <p className="action-description">
                                                    {getActionDescription(history.actionType)}
                                                </p>
                                            </div>
                                            
                                            {history.category && (
                                                <div 
                                                    className="category-badge"
                                                    style={{ backgroundColor: getCategoryColor(history.category) }}
                                                >
                                                    {getCategoryLabel(history.category)}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {renderHistoryDetails(history)}
                                        
                                        <div className="card-footer">
                                            <div className="timestamp">
                                                <Clock size={14} />
                                                {formatTimestamp(history.timestamp)}
                                            </div>
                                            
                                            {history.complaint_id && (
                                                <div className="complaint-link">
                                                    <FileText size={14} />
                                                    Complaint: {history.complaint_id.substring(0, 8)}...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }, [histories, loading, filters.actionType, filters.category]);

    return (
        <div className="user-history">
            {headerComponent}
            
            {error && (
                <div className="history-error">
                    <AlertCircle className="error-icon" />
                    <span>{error}</span>
                </div>
            )}

            {contentComponent}
        </div>
    );
};

export default UserHistory;