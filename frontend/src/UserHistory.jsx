import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    
    // Mobile detection for pagination
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    // Mobile pagination state
    const [currentMobilePage, setCurrentMobilePage] = useState(0); // 0-indexed page number
    
    // Ref for UserHistory section to scroll to on page change
    const userHistoryRef = useRef(null);
    
    // Handle window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Reset mobile page when filters change
    useEffect(() => {
        setCurrentMobilePage(0);
    }, [filters]);

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

    // Intersection observer for infinite scrolling at the bottom (desktop only)
    const { ref } = useInView({
        threshold: 1,
        onChange: (inView) => {
            // Only trigger infinite scroll on desktop
            if (!isMobile && inView && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    // Intersection observer for prefetching when 8th item is visible (desktop only)
    const { ref: prefetchRef } = useInView({
        threshold: 0.1,
        onChange: (inView) => {
            // Only prefetch on desktop
            if (!isMobile && inView && hasNextPage && !isFetchingNextPage) {
                // console.log('8th record visible, prefetching next page...');
                fetchNextPage();
            }
        },
    });

    // Get histories based on device type
    // Mobile: Show only current page (10 histories per page)
    // Desktop: Show all loaded pages (infinite scroll)
    const allHistories = data?.pages?.flatMap(page => page.histories) || [];
    const mobileHistories = (isMobile && data?.pages?.[currentMobilePage]) 
        ? data.pages[currentMobilePage].histories || [] 
        : [];
    
    // Display histories based on device
    const displayHistories = isMobile ? mobileHistories : allHistories;

    const handleRefresh = useCallback(() => {
        clearCacheAndRefetch();
    }, [clearCacheAndRefetch]);

    const handleFilterChange = useCallback((filterType, value) => {
        dispatch(setFilters({ [filterType]: value }));
    }, [dispatch]);
    
    // Mobile pagination functions
    const scrollToHistory = () => {
        if (userHistoryRef.current) {
            userHistoryRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    };

    const goToPage = async (pageIndex) => {
        // If the page hasn't been loaded yet, fetch it
        if (pageIndex >= (data?.pages?.length || 0) && hasNextPage) {
            await fetchNextPage();
        }
        setCurrentMobilePage(pageIndex);
        scrollToHistory();
    };

    const goToPrevPage = () => {
        if (currentMobilePage > 0) {
            setCurrentMobilePage(currentMobilePage - 1);
            scrollToHistory();
        }
    };

    const goToNextPage = async () => {
        const totalLoadedPages = data?.pages?.length || 0;
        const nextPage = currentMobilePage + 1;
        
        // If next page exists in loaded data, go to it
        if (nextPage < totalLoadedPages) {
            setCurrentMobilePage(nextPage);
            scrollToHistory();
        } 
        // If next page hasn't been loaded yet but more pages exist, fetch it
        else if (hasNextPage && !isFetchingNextPage) {
            await fetchNextPage();
            setCurrentMobilePage(nextPage);
            scrollToHistory();
        }
    };

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
                {displayHistories.length === 0 ? (
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
                            {displayHistories.map((history, index) => {
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
                                            {index < displayHistories.length - 1 && <div className="marker-line"></div>}
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

                        {/* Desktop: Infinite Scroll Loading Indicator */}
                        {!isMobile && hasNextPage && (
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
                        
                        {/* Mobile: Static Pagination */}
                        {isMobile && displayHistories.length > 0 && (
                            <div className="history-pagination-container">
                                <button
                                    className="pagination-btn prev"
                                    onClick={goToPrevPage}
                                    disabled={currentMobilePage === 0 || isFetchingNextPage}
                                >
                                    Prev
                                </button>
                                
                                <div className="pagination-pages">
                                    {(() => {
                                        const totalLoadedPages = data?.pages?.length || 0;
                                        const pages = [];
                                        const maxVisiblePages = 5;
                                        
                                        // Calculate range of pages to show
                                        let startPage = Math.max(0, currentMobilePage - 2);
                                        let endPage = Math.min(totalLoadedPages - 1, startPage + maxVisiblePages - 1);
                                        
                                        // Adjust start if we're near the end
                                        if (endPage - startPage < maxVisiblePages - 1) {
                                            startPage = Math.max(0, endPage - maxVisiblePages + 1);
                                        }
                                        
                                        // Show first page if not in range
                                        if (startPage > 0) {
                                            pages.push(
                                                <button
                                                    key={0}
                                                    className="pagination-page-btn"
                                                    onClick={() => goToPage(0)}
                                                    disabled={isFetchingNextPage}
                                                >
                                                    1
                                                </button>
                                            );
                                            if (startPage > 1) {
                                                pages.push(
                                                    <span key="ellipsis-start" className="pagination-ellipsis">
                                                        ...
                                                    </span>
                                                );
                                            }
                                        }
                                        
                                        // Show page range
                                        for (let i = startPage; i <= endPage; i++) {
                                            pages.push(
                                                <button
                                                    key={i}
                                                    className={`pagination-page-btn ${i === currentMobilePage ? 'active' : ''}`}
                                                    onClick={() => goToPage(i)}
                                                    disabled={isFetchingNextPage}
                                                >
                                                    {i + 1}
                                                </button>
                                            );
                                        }
                                        
                                        // Show ellipsis and next indicator if more pages available
                                        if (hasNextPage) {
                                            pages.push(
                                                <span key="ellipsis-end" className="pagination-ellipsis">
                                                    ...
                                                </span>
                                            );
                                        }
                                        
                                        return pages;
                                    })()}
                                    
                                    {isFetchingNextPage && (
                                        <div className="pagination-loading">
                                            <div className="loading-spinner-small"></div>
                                        </div>
                                    )}
                                </div>
                                
                                <button
                                    className="pagination-btn next"
                                    onClick={goToNextPage}
                                    disabled={(!hasNextPage && currentMobilePage >= (data?.pages?.length || 1) - 1) || isFetchingNextPage}
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {/* End of list indicator */}
                        {!hasNextPage && displayHistories.length > 0 && (
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
        <div className="user-history" ref={userHistoryRef}>
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