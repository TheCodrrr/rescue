import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, deleteNotification, markNotificationAsRead, clearNotificationError, addNotification } from './auth/redux/notificationSlice';
import { io } from 'socket.io-client';
import { 
    Bell, 
    Trash2, 
    Clock, 
    AlertTriangle, 
    CheckCircle, 
    X,
    RefreshCw,
    Inbox,
    TrendingUp,
    User
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Notifications.css';

const Notifications = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications, isLoading, error, unreadCount } = useSelector((state) => state.notifications);
    const { user } = useSelector((state) => state.auth);
    
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
    const [deletingIndex, setDeletingIndex] = useState(null);
    const socketRef = useRef(null);

    // Fetch notifications when component mounts
    useEffect(() => {
        if (user) {
            dispatch(fetchNotifications());
        }
    }, [dispatch, user]);

    // Socket.io connection for real-time notifications
    useEffect(() => {
        if (!user) return;

        const socketURL = import.meta.env.VITE_SOCKET_URL || 
                          import.meta.env.REACT_APP_SOCKET_URL || 
                          'http://localhost:5000';

        console.log("🔌 Notifications connecting to socket:", socketURL);

        socketRef.current = io(socketURL, {
            reconnection: true,
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
            console.log('✅ Notifications socket connected:', socketRef.current.id);
        });

        socketRef.current.on('disconnect', (reason) => {
            console.log('❌ Notifications socket disconnected:', reason);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('🔴 Socket connection error:', error);
        });

        // Listen for notifications specific to this user
        const notificationEvent = `notification:${user._id}`;
        console.log('👂 Listening for notifications on event:', notificationEvent);

        socketRef.current.on(notificationEvent, (notificationData) => {
            console.log('🔔 Received real-time notification:', notificationData);
            
            // Refresh notifications to get the latest from backend
            dispatch(fetchNotifications());
            
            // Show toast notification
            toast.success(
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong>New Notification</strong>
                    <span style={{ fontSize: '0.9em' }}>
                        {notificationData.complaint_title} escalated to Level {notificationData.to_level}
                    </span>
                </div>,
                {
                    duration: 5000,
                    position: 'top-right',
                    icon: '🔔',
                    style: {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '12px',
                    }
                }
            );

            // Play notification sound
            playNotificationSound();
        });

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                console.log('🔌 Disconnecting notifications socket');
                socketRef.current.off(notificationEvent);
                socketRef.current.disconnect();
            }
        };
    }, [user, dispatch]);

    // Play notification sound
    const playNotificationSound = () => {
        try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => {
                console.log('Could not play notification sound:', err);
            });
        } catch (error) {
            console.log('Notification sound not available:', error);
        }
    };

    useEffect(() => {
        if (error) {
            toast.error(error, {
                duration: 3000,
                position: 'top-center',
            });
            dispatch(clearNotificationError());
        }
    }, [error, dispatch]);

    const handleRefresh = () => {
        dispatch(fetchNotifications());
        toast.success('Notifications refreshed', {
            duration: 2000,
            position: 'top-center',
            icon: '🔄'
        });
    };

    const handleDelete = async (index) => {
        setDeletingIndex(index);
        try {
            const result = await dispatch(deleteNotification(index));
            if (deleteNotification.fulfilled.match(result)) {
                toast.success('Notification deleted', {
                    duration: 2000,
                    position: 'top-center',
                    icon: '🗑️'
                });
            } else {
                toast.error('Failed to delete notification');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Failed to delete notification');
        } finally {
            setDeletingIndex(null);
        }
    };

    const handleNotificationClick = (notification, index) => {
        // Mark as read
        if (!notification.read) {
            dispatch(markNotificationAsRead(index));
        }
        
        // Navigate to complaint detail if complaint_id exists
        if (notification.complaint_id) {
            navigate(`/complaint/${notification.complaint_id}`);
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'escalation':
                return <TrendingUp className="notification-type-icon escalation" />;
            case 'assignment':
                return <User className="notification-type-icon assignment" />;
            case 'status_update':
                return <CheckCircle className="notification-type-icon status" />;
            default:
                return <Bell className="notification-type-icon default" />;
        }
    };

    const getSeverityClass = (fromLevel, toLevel) => {
        if (toLevel >= 3) return 'severity-critical';
        if (toLevel === 2) return 'severity-high';
        if (toLevel === 1) return 'severity-medium';
        return 'severity-low';
    };

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'unread') return !notification.read;
        if (filter === 'read') return notification.read;
        return true;
    });

    if (!user) {
        return (
            <div className="notifications-container">
                <div className="notifications-empty">
                    <AlertTriangle className="empty-icon" />
                    <h3>Please log in to view notifications</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="notifications-container">
            {/* Header */}
            <div className="notifications-header">
                <div className="notifications-title-section">
                    <Bell className="notifications-title-icon" />
                    <h2>Notifications</h2>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}
                </div>
                <button 
                    className="refresh-btn" 
                    onClick={handleRefresh}
                    disabled={isLoading}
                    title="Refresh notifications"
                >
                    <RefreshCw className={`refresh-icon ${isLoading ? 'spinning' : ''}`} />
                </button>
            </div>

            {/* Filters */}
            <div className="notifications-filters">
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({notifications.length})
                </button>
                <button 
                    className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    Unread ({unreadCount})
                </button>
                <button 
                    className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                >
                    Read ({notifications.length - unreadCount})
                </button>
            </div>

            {/* Notifications List */}
            <div className="notifications-list">
                {isLoading && notifications.length === 0 ? (
                    <div className="notifications-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="notifications-empty">
                        <Inbox className="empty-icon" />
                        <h3>No notifications</h3>
                        <p>
                            {filter === 'unread' 
                                ? "You're all caught up! No unread notifications."
                                : filter === 'read'
                                ? "No read notifications yet."
                                : "You'll see notifications here when you have updates."}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notification, index) => (
                        <div 
                            key={index}
                            className={`notification-card ${!notification.read ? 'unread' : ''} ${getSeverityClass(notification.from_level, notification.to_level)}`}
                            onClick={() => handleNotificationClick(notification, index)}
                        >
                            <div className="notification-indicator">
                                {!notification.read && <div className="unread-dot"></div>}
                            </div>
                            
                            <div className="notification-icon-wrapper">
                                {getNotificationIcon(notification.type)}
                            </div>
                            
                            <div className="notification-content">
                                <div className="notification-header-row">
                                    <h4 className="notification-title">
                                        Complaint Escalated
                                    </h4>
                                    <div className="notification-actions">
                                        <span className="notification-time">
                                            <Clock className="time-icon" />
                                            {formatTimestamp(notification.timestamp)}
                                        </span>
                                        <button
                                            className="delete-notification-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(index);
                                            }}
                                            disabled={deletingIndex === index}
                                            title="Delete notification"
                                        >
                                            {deletingIndex === index ? (
                                                <div className="mini-spinner"></div>
                                            ) : (
                                                <Trash2 className="delete-icon" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                <p className="notification-complaint-title">
                                    <strong>{notification.complaint_title}</strong>
                                </p>
                                
                                <div className="notification-escalation-info">
                                    <div className="escalation-badge">
                                        <span className="level-badge from">Level {notification.from_level}</span>
                                        <TrendingUp className="arrow-icon" />
                                        <span className="level-badge to">Level {notification.to_level}</span>
                                    </div>
                                </div>
                                
                                {notification.reason && (
                                    <p className="notification-reason">
                                        <em>"{notification.reason}"</em>
                                    </p>
                                )}
                                
                                <p className="notification-escalated-by">
                                    Escalated by <strong>{notification.escalated_by}</strong>
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
