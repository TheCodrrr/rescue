import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useInView } from 'react-intersection-observer';
import { useUserHistoryCache } from './hooks/useUserHistoryCache.jsx';
import { 
    setFilters, 
    clearError,
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
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const filters = useSelector(selectHistoryFilters);

    // Use the infinite query hook with filters
    const { 
        data, 
        fetchNextPage, 
        hasNextPage, 
        isFetchingNextPage, 
        status, 
        error,
        isLoading,
        clearCacheAndRefetch,
        totalCount
    } = useUserHistoryCache(user?._id, filters);

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

    // Intersection observer for infinite scrolling at the bottom
    const { ref } = useInView({
        threshold: 1,
        onChange: (inView) => {
            if (inView && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    // Intersection observer for prefetching when 8th item is visible
    const { ref: prefetchRef } = useInView({
        threshold: 0.1,
        onChange: (inView) => {
            if (inView && hasNextPage && !isFetchingNextPage) {
                // console.log('8th record visible, prefetching next page...');
                fetchNextPage();
            }
        },
    });

    // Get all histories from pages
    const allHistories = data?.pages?.flatMap(page => page.histories) || [];

    const handleRefresh = useCallback(() => {
        clearCacheAndRefetch();
    }, [clearCacheAndRefetch]);

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

    // Memoized header component - won't re-render unless status changes
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
                        {totalCount > 0 && ` • ${totalCount} total records`}
                    </p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className={`refresh-btn ${status === 'pending' ? 'refreshing' : ''}`}
                    disabled={status === 'pending'}
                >
                    <RefreshCw className={`refresh-icon ${status === 'pending' ? 'spinning' : ''}`} />
                    {status === 'pending' ? 'Refreshing...' : 'Refresh'}
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
    ), [filters, handleRefresh, status, totalCount]);

    // Memoized content component - will only re-render when histories, loading, or error changes
    const contentComponent = useMemo(() => {
        if (isLoading) {
            return (
                <div className="history-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your history...</p>
                </div>
            );
        }

        return (
            <div className="history-content">
                {allHistories.length === 0 ? (
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
                    <>
                        <div className="history-timeline">
                            {allHistories.map((history, index) => {
                                const ActionIcon = getActionIcon(history.actionType);
                                const actionColor = getActionColor(history.actionType);
                                
                                // Attach prefetch ref to every 8th item (index 7, 17, 27, etc.)
                                // This triggers prefetch when user scrolls to 80% of each page
                                const shouldPrefetch = (index + 1) % 10 === 8;
                            
                                return (
                                    <div 
                                        key={history._id} 
                                        ref={shouldPrefetch ? prefetchRef : null}
                                        className="history-item" 
                                        style={{'--delay': `${index * 0.1}s`}}
                                    >
                                        <div className="history-marker">
                                            <div 
                                                className="marker-icon"
                                                style={{ backgroundColor: actionColor }}
                                            >
                                                <ActionIcon size={16} />
                                            </div>
                                            {index < allHistories.length - 1 && <div className="marker-line"></div>}
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

                        {/* Infinite Scroll Loading Indicator */}
                        {hasNextPage && (
                            <div ref={ref} className="history-loading-more-container">
                                {isFetchingNextPage ? (
                                    <div className="history-loading-more">
                                        <div className="loading-spinner-small"></div>
                                        <p>Loading more history...</p>
                                    </div>
                                ) : (
                                    <div className="history-load-more-trigger">
                                        <p>Scroll to load more</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* End of list indicator */}
                        {!hasNextPage && allHistories.length > 0 && (
                            <div className="history-end-of-list">
                                <CheckCircle size={20} />
                                <p>You've reached the end of your history</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }, [allHistories, isLoading, filters.actionType, filters.category, hasNextPage, isFetchingNextPage]);

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