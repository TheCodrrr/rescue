import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from '../Footer';
import './OfficerComplaint.css';
import { fetchNearbyComplaints, clearOfficerError, addNewComplaintRealtime, rejectComplaint, acceptComplaint, addEscalationEvent } from '../auth/redux/officerSlice';
import { addComplaintEscalatedHistory } from '../auth/redux/historySlice';
import useGeolocation from '../hooks/useGeolocation';
import ComplaintMap from './ComplaintMap';
import { CompactEscalationBadge } from '../EscalationBadge';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const OfficerComplaint = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useGeolocation();
    const socketRef = useRef(null);
    
    const { 
        nearbyComplaints, 
        totalComplaints, 
        isLoading, 
        error,
        officerLocation 
    } = useSelector((state) => state.officer);

    const { user } = useSelector((state) => state.auth);

    const [filterSeverity, setFilterSeverity] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [rejectedComplaintIds, setRejectedComplaintIds] = useState(new Set());
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const complaintCardRefs = useRef({});
    const processedComplaintIds = useRef(new Set()); // Track processed real-time complaints

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    };

    // Play notification sound for high priority complaints
    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    };

    // Fetch nearby complaints when location is available
    useEffect(() => {
        if (location.latitude && location.longitude && !location.loading) {
            console.log('Fetching complaints for location:', location);
            dispatch(fetchNearbyComplaints({
                latitude: location.latitude,
                longitude: location.longitude
            }));
        }
    }, [location.latitude, location.longitude, location.loading, dispatch]);

    // Track when complaints have loaded at least once
    useEffect(() => {
        if (!isLoading && totalComplaints >= 0) {
            setHasLoadedOnce(true);
        }
    }, [isLoading, totalComplaints]);

    // Socket.io connection for real-time updates
    useEffect(() => {
        // Initialize socket connection
        const socketURL = import.meta.env.VITE_SOCKET_URL || 
                         import.meta.env.VITE_API_URL?.replace('/api/v1', '') ||
                         'http://localhost:5000';
        
        console.log("🔌 Officer connecting to socket:", socketURL);
        
        socketRef.current = io(socketURL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socketRef.current.on('connect', () => {
            console.log('✅ Officer socket connected:', socketRef.current.id);
            setSocketConnected(true);
            toast.success('Connected to real-time updates');
        });

        socketRef.current.on('disconnect', (reason) => {
            console.log('❌ Officer socket disconnected:', reason);
            setSocketConnected(false);
            if (reason === 'io server disconnect') {
                // Reconnect manually if server disconnected
                socketRef.current.connect();
            }
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Listen for new complaints specifically for officers
        socketRef.current.on('newComplaintForOfficer', (data) => {
            console.log('🚨 New complaint for officer received:', data);
            
            const { complaint, location: complaintLocation, severity, category } = data;
            
            // Check if we've already processed this complaint
            if (processedComplaintIds.current.has(complaint._id)) {
                console.log('⏭️ Complaint already processed, skipping:', complaint._id);
                return;
            }
            
            // Check if complaint is within our vicinity based on officer's location
            if (location.latitude && location.longitude && complaintLocation?.coordinates) {
                const [lng, lat] = complaintLocation.coordinates;
                const distance = calculateDistance(
                    location.latitude, 
                    location.longitude, 
                    lat, 
                    lng
                );
                
                console.log(`Complaint distance: ${distance.toFixed(2)}km, Severity: ${severity}`);
                
                // Check if complaint is within the relevant radius for its severity
                let isInRange = false;
                if (severity === 'low' && distance <= 10) {
                    isInRange = true;
                } else if (severity === 'medium' && distance <= 20) {
                    isInRange = true;
                } else if (severity === 'high' && distance <= 200) {
                    isInRange = true;
                }
                
                if (isInRange) {
                    console.log('✅ Complaint is in range, adding to list');
                    
                    // Mark as processed
                    processedComplaintIds.current.add(complaint._id);
                    
                    // Dispatch to Redux (which now has duplicate check)
                    dispatch(addNewComplaintRealtime(complaint));
                    
                    // Show notification
                    toast.success(
                        `New ${severity} priority ${category} complaint nearby!`,
                        {
                            duration: 5000,
                            icon: severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : 'ℹ️',
                        }
                    );
                    
                    // Play notification sound (optional)
                    if (severity === 'high') {
                        playNotificationSound();
                    }
                } else {
                    console.log('⚠️ Complaint is out of range for its severity level');
                }
            }
        });

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                console.log('🔌 Disconnecting officer socket');
                socketRef.current.off('newComplaintForOfficer');
                socketRef.current.disconnect();
            }
        };
    }, [dispatch, location.latitude, location.longitude]);

    // Auto-refresh every 2 minutes
    useEffect(() => {
        if (location.latitude && location.longitude) {
            const interval = setInterval(() => {
                dispatch(fetchNearbyComplaints({
                    latitude: location.latitude,
                    longitude: location.longitude
                }));
            }, 120000); // 2 minutes

            return () => clearInterval(interval);
        }
    }, [location.latitude, location.longitude, dispatch]);

    // Clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                dispatch(clearOfficerError());
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, dispatch]);

    // Combine all complaints from different severity levels - Memoized to prevent re-renders
    const allComplaints = useMemo(() => [
        ...(nearbyComplaints.low_severity?.complaints || []),
        ...(nearbyComplaints.medium_severity?.complaints || []),
        ...(nearbyComplaints.high_severity?.complaints || [])
    ], [nearbyComplaints]);

    // Filter complaints based on status, severity, search query, and rejection status - Memoized
    const filteredComplaints = useMemo(() => {
        return allComplaints.filter(complaint => {
            const matchesSeverity = filterSeverity === 'all' || complaint.severity === filterSeverity;
            const matchesSearch = complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                complaint.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                complaint.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const notRejected = !rejectedComplaintIds.has(complaint._id);
            return matchesSeverity && matchesSearch && notRejected;
        });
    }, [allComplaints, filterSeverity, searchQuery, rejectedComplaintIds]);

    // Masonry layout - adjust grid row spans based on card height
    useEffect(() => {
        const resizeGridItems = () => {
            const grid = document.querySelector('.officer-complaints-grid');
            if (!grid) return;

            const rowHeight = 10; // matches grid-auto-rows
            const rowGap = 24; // matches gap: 1.5rem (24px)

            Object.keys(complaintCardRefs.current).forEach(id => {
                const card = complaintCardRefs.current[id];
                if (card) {
                    const cardHeight = card.getBoundingClientRect().height;
                    const rowSpan = Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap));
                    card.style.gridRowEnd = `span ${rowSpan}`;
                }
            });
        };

        // Run after render and on window resize
        resizeGridItems();
        window.addEventListener('resize', resizeGridItems);
        
        // Also run when filters change
        const timer = setTimeout(resizeGridItems, 100);

        return () => {
            window.removeEventListener('resize', resizeGridItems);
            clearTimeout(timer);
        };
    }, [filterSeverity, searchQuery, nearbyComplaints]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDistance = (complaint) => {
        // Calculate distance based on severity zone
        if (complaint.severity === 'low') {
            return `Within 10km`;
        } else if (complaint.severity === 'medium') {
            return `Within 20km`;
        } else {
            return `Within 200km`;
        }
    };

    const handleComplaintClick = useCallback((complaint) => {
        setSelectedComplaint(complaint);
        console.log('Selected complaint:', complaint);
    }, []);

    const handleVisitComplaint = useCallback((complaint) => {
        // Clear any potential state conflicts and navigate
        setTimeout(() => {
            navigate(`/complaint/${complaint._id}`, { replace: true });
        }, 0);
    }, [navigate]);

    const handleIgnoreComplaint = useCallback(async (complaintId, e) => {
        e.stopPropagation();
        
        try {
            // Show loading toast
            const loadingToast = toast.loading('Rejecting complaint...');
            
            // Use Redux thunk to reject complaint
            const result = await dispatch(rejectComplaint(complaintId));
            
            // Dismiss loading toast
            toast.dismiss(loadingToast);

            if (rejectComplaint.fulfilled.match(result)) {
                // Add complaint ID to rejected set
                setRejectedComplaintIds(prev => new Set([...prev, complaintId]));
                
                // If this was the selected complaint, clear selection
                if (selectedComplaint?._id === complaintId) {
                    setSelectedComplaint(null);
                }
                
                // Show success toast
                toast.success('Complaint rejected successfully');
                
                console.log('✅ Complaint rejected:', complaintId);
            } else {
                throw new Error(result.payload || 'Failed to reject complaint');
            }
        } catch (error) {
            console.error('Error rejecting complaint:', error);
            toast.error(error.message || 'Failed to reject complaint');
        }
    }, [dispatch, selectedComplaint]);

    const handleAcceptComplaint = async (complaintId, e) => {
        e.stopPropagation();
        
        if (!user || !user._id) {
            toast.error('User information not available');
            return;
        }

        try {
            // Show loading toast
            const loadingToast = toast.loading('Accepting complaint...');
            
            // Find the complaint to get category info
            const complaint = allComplaints.find(c => c._id === complaintId);
            const complaintCategory = complaint?.category || null;
            
            // Use Redux thunk to accept complaint
            const acceptResult = await dispatch(acceptComplaint({ 
                complaintId, 
                officerId: user._id 
            }));

            if (acceptComplaint.fulfilled.match(acceptResult)) {
                // Officer accepted complaint - complaint stays at level 1
                console.log('✅ Complaint accepted by officer:', complaintId);

                // Remove complaint from rejected list if it was there
                setRejectedComplaintIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(complaintId);
                    return newSet;
                });
                
                // If this was the selected complaint, clear selection
                if (selectedComplaint?._id === complaintId) {
                    setSelectedComplaint(null);
                }
                
                // Dismiss loading and show success
                toast.dismiss(loadingToast);
                toast.success('Complaint accepted and assigned to you successfully!', {
                    duration: 4000,
                    icon: '✅'
                });
                
                // No need to refresh - Redux state is already updated in acceptComplaint.fulfilled
                // This prevents the second unnecessary re-render
                
                console.log('✅ Complaint accepted:', complaintId);
            } else {
                toast.dismiss(loadingToast);
                throw new Error(acceptResult.payload || 'Failed to accept complaint');
            }
        } catch (error) {
            console.error('Error accepting complaint:', error);
            toast.error(error.message || 'Failed to accept complaint');
        }
    };

    // Handle click outside to deselect complaint
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectedComplaint) {
                // Check if click is outside all complaint cards
                const clickedOutside = !Object.values(complaintCardRefs.current).some(ref => 
                    ref && ref.contains(event.target)
                );
                
                if (clickedOutside) {
                    setSelectedComplaint(null);
                    console.log('Deselected complaint - clicked outside');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedComplaint]);

    return (
        <>
            <Navbar />
            <div className="officer-complaint-container">
                <div className="officer-complaint-header">
                    <h1 className="officer-complaint-title">
                        Nearby Complaints
                        {isLoading && hasLoadedOnce && (
                            <span className="refreshing-indicator" title="Refreshing data...">
                                <svg className="spinner-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </span>
                        )}
                    </h1>
                    <p className="officer-complaint-subtitle">
                        {location.loading ? (
                            'Getting your location...'
                        ) : location.error ? (
                            <span className="location-error">{location.error}</span>
                        ) : (
                            `Showing complaints near your location • Total: ${totalComplaints}`
                        )}
                    </p>
                    {/* Real-time connection status */}
                    <div className={`realtime-status ${socketConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-indicator"></span>
                        <span className="status-text">
                            {socketConnected ? 'Real-time updates active' : 'Connecting...'}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="officer-complaint-error-banner">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                <div className="officer-complaint-controls">
                    <div className="officer-complaint-search-box">
                        <svg className="officer-complaint-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search complaints..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="officer-complaint-search-input"
                        />
                    </div>

                    <div className="officer-complaint-filter-section">
                        <div className="officer-complaint-filter-group">
                            <label>Severity:</label>
                            <div className="officer-complaint-filter-buttons">
                                <button
                                    className={`officer-complaint-filter-btn ${filterSeverity === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilterSeverity('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`officer-complaint-filter-btn ${filterSeverity === 'low' ? 'active' : ''}`}
                                    onClick={() => setFilterSeverity('low')}
                                >
                                    Low
                                </button>
                                <button
                                    className={`officer-complaint-filter-btn ${filterSeverity === 'medium' ? 'active' : ''}`}
                                    onClick={() => setFilterSeverity('medium')}
                                >
                                    Medium
                                </button>
                                <button
                                    className={`officer-complaint-filter-btn ${filterSeverity === 'high' ? 'active' : ''}`}
                                    onClick={() => setFilterSeverity('high')}
                                >
                                    High
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="officer-complaint-stats">
                    <div className="officer-stat-card">
                        <div className="officer-stat-icon low-severity">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="officer-stat-details">
                            <h3>{nearbyComplaints.low_severity?.count || 0}</h3>
                            <p>Low Priority (10km)</p>
                        </div>
                    </div>
                    <div className="officer-stat-card">
                        <div className="officer-stat-icon medium-severity">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="officer-stat-details">
                            <h3>{nearbyComplaints.medium_severity?.count || 0}</h3>
                            <p>Medium Priority (20km)</p>
                        </div>
                    </div>
                    <div className="officer-stat-card">
                        <div className="officer-stat-icon high-severity">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="officer-stat-details">
                            <h3>{nearbyComplaints.high_severity?.count || 0}</h3>
                            <p>High Priority (200km)</p>
                        </div>
                    </div>
                </div>

                {/* Page-wide Map */}
                {!location.error && !isLoading && filteredComplaints.length > 0 && (
                    <div className="officer-complaint-map-section">
                        <ComplaintMap 
                            officerLocation={location}
                            complaints={selectedComplaint ? [selectedComplaint] : filteredComplaints}
                            onComplaintClick={handleComplaintClick}
                        />
                    </div>
                )}

                {isLoading && !hasLoadedOnce ? (
                    <div className="officer-complaint-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading nearby complaints...</p>
                    </div>
                ) : location.error ? (
                    <div className="officer-complaint-empty">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <h3>Location Required</h3>
                        <p>{location.error}</p>
                    </div>
                ) : filteredComplaints.length === 0 ? (
                    <div className="officer-complaint-empty">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3>No Complaints Found</h3>
                        <p>There are no complaints matching your filters in your area.</p>
                    </div>
                ) : (
                    <div className="officer-complaints-grid">
                        {filteredComplaints.map((complaint) => (
                            <div 
                                key={complaint._id} 
                                ref={el => complaintCardRefs.current[complaint._id] = el}
                                className={`officer-complaint-card ${selectedComplaint?._id === complaint._id ? 'selected' : ''}`}
                                onClick={() => handleComplaintClick(complaint)}
                            >
                                <div className="officer-complaint-card-header">
                                    <h3 className="officer-complaint-card-title">{complaint.title?.substring(0, 15) + (complaint.title?.length > 15 ? "..." : "")}</h3>
                                    <div className="officer-complaint-header-actions">
                                        <CompactEscalationBadge complaint={complaint} />
                                        <span className={`officer-complaint-priority-badge officer-complaint-priority-${complaint.severity}`}>
                                            {complaint.severity}
                                        </span>
                                        <button 
                                            className="officer-complaint-info-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVisitComplaint(complaint);
                                            }}
                                            title="View full details"
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <p className="officer-complaint-description">
                                    {complaint.description?.substring(0, 35)}
                                    {complaint.description?.length > 35 ? '...' : ''}
                                </p>

                                <div className="officer-complaint-meta">
                                    <span className="officer-complaint-category">
                                        {complaint.category}
                                    </span>
                                    <span className="officer-complaint-distance">
                                        {formatDistance(complaint)}
                                    </span>
                                </div>

                                <div className="officer-complaint-details">
                                    <div className="officer-complaint-detail-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{complaint.address || 'Location not specified'}</span>
                                    </div>
                                    <div className="officer-complaint-detail-item">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>{formatDate(complaint.createdAt)}</span>
                                    </div>
                                </div>

                                {complaint.user_id && (
                                    <div className="officer-complaint-user">
                                        <img 
                                            src={complaint.user_id.profileImage || '/default-avatar.png'} 
                                            alt={complaint.user_id.name}
                                            className="officer-complaint-user-avatar"
                                        />
                                        <span>{complaint.user_id.name}</span>
                                    </div>
                                )}

                                {complaint.category === 'rail' && complaint.category_specific_data && (
                                    <div className="officer-complaint-rail-info">
                                        <div className="rail-info-header">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            <span>Train: {complaint.category_specific_data.train_name}</span>
                                        </div>
                                        <p className="rail-train-number">#{complaint.category_specific_data.train_number}</p>
                                    </div>
                                )}

                                <div className="officer-complaint-status">
                                    <span className={`officer-complaint-status-badge officer-complaint-status-${complaint.status}`}>
                                        {complaint.status.replace(/-|_/g, ' ')}
                                    </span>
                                </div>
                                
                                {!complaint.assigned_officer_id && (
                                    <div className="officer-complaint-actions">
                                        <button 
                                            className="officer-complaint-ignore-btn"
                                            onClick={(e) => handleIgnoreComplaint(complaint._id, e)}
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Ignore
                                        </button>
                                        <button 
                                            className="officer-complaint-assign-btn"
                                            onClick={(e) => handleAcceptComplaint(complaint._id, e)}
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Accept
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default OfficerComplaint;
