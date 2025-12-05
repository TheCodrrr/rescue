import React, { useState, useEffect, useRef } from "react";
import "./Home.css";
import "leaflet/dist/leaflet.css";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { loadUser, loginSuccess, logout } from "./auth/redux/authSlice";
import { getNearbyComplaints } from "./auth/redux/complaintSlice";
import Footer from "./Footer";
import Navbar from "./Navbar";
import { io } from "socket.io-client";
import { 
  MdTrain, 
  MdConstruction, 
  MdLocalFireDepartment, 
  MdBalance,
  MdLocationOn,
  MdSecurity
} from 'react-icons/md';
import { 
  FiAlertTriangle, 
  FiThumbsUp, 
  FiThumbsDown,
  FiEye,
  FiUsers,
  FiShield
} from 'react-icons/fi';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Helper function to extract coordinates from complaint data
function getComplaintCoordinates(complaint) {
    // Try new GeoJSON format first, then fall back to old format
    const lat = complaint?.location?.coordinates?.[1] ?? complaint?.latitude ?? complaint?.lat ?? complaint?.location?.latitude ?? complaint?.location?.lat;
    const lng = complaint?.location?.coordinates?.[0] ?? complaint?.longitude ?? complaint?.lng ?? complaint?.location?.longitude ?? complaint?.location?.lng;
    
    return {
        lat: typeof lat === 'string' ? parseFloat(lat) : lat,
        lng: typeof lng === 'string' ? parseFloat(lng) : lng
    };
}

export default function Home() {
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
    const { isLoading: complaintsLoading } = useSelector((state) => state.complaints);
    const [locationPermission, setLocationPermission] = useState(null); // 'granted', 'denied', 'prompt', null
    const [userLocation, setUserLocation] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    
    // Map interaction state
    const [isMapActive, setIsMapActive] = useState(false);
    
    // Recent complaints state for right panel
    const [recentComplaints, setRecentComplaints] = useState([]);
    
    // Category filter state
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    // Filtered complaints based on selected category
    const filteredComplaints = recentComplaints.filter(complaint => 
        selectedCategory === 'all' || complaint.category === selectedCategory
    );
    
    const navigate = useNavigate(); 
    const dispatch = useDispatch();
    const location = useLocation();
    const hasLoadedUser = useRef(false);
    const mapRef = useRef(null);

    const socketRef = useRef(null);
    const incidentMarkersRef = useRef([]);

    // Function to request location permission with faster timeout
    const requestLocationPermission = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.log('Geolocation is not supported by this browser');
                setLocationPermission('denied');
                const fallbackLocation = { lat: 28.6139, lng: 77.2090 }; // Delhi, India fallback
                setUserLocation(fallbackLocation);
                resolve(fallbackLocation);
                return;
            }

            // Set a manual timeout to ensure we don't wait forever
            const timeoutId = setTimeout(() => {
                console.log('⏱️ Location request timed out after 5 seconds');
                setLocationPermission('denied');
                const fallbackLocation = { lat: 28.6139, lng: 77.2090 }; // Delhi, India fallback
                setUserLocation(fallbackLocation);
                resolve(fallbackLocation);
            }, 5000); // 5 second timeout

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId); // Clear the manual timeout
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log('✅ Location permission granted:', location);
                    setLocationPermission('granted');
                    setUserLocation(location);
                    resolve(location);
                },
                (error) => {
                    clearTimeout(timeoutId); // Clear the manual timeout
                    console.log('❌ Location access denied or failed:', error.message);
                    setLocationPermission('denied');
                    const fallbackLocation = { lat: 28.6139, lng: 77.2090 }; // Delhi, India fallback
                    setUserLocation(fallbackLocation);
                    resolve(fallbackLocation);
                },
                {
                    enableHighAccuracy: false, // Use false for faster response
                    timeout: 5000, // Reduced from 10000 to 5000
                    maximumAge: 300000 // 5 minutes - can use cached position
                }
            );
        });
    };

    // Navigate to complaint detail page
    const handleViewComplaintDetails = (complaint) => {
        console.log("From home.jsx: ", complaint);
        // Clear any potential state conflicts and navigate
        setTimeout(() => {
            navigate(`/complaint/${complaint.id}`, { replace: true });
        }, 0);
    };

    // Socket initialization
    useEffect(() => {
        // Initialize socket connection
        const socketURL = import.meta.env.VITE_SOCKET_URL || 
                         'http://localhost:5000';
        
        console.log("Initializing socket connection to:", socketURL);
        socketRef.current = io(socketURL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current.id);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        // Set up the newComplaint listener here (for storing pending complaints)
        socketRef.current.on('newComplaint', (complaint) => {
            console.log('🚨 New complaint received via socket:', complaint);
            console.log('Complaint details:', {
                id: complaint._id,
                title: complaint.title,
                category: complaint.category,
                coordinates: getComplaintCoordinates(complaint),
                address: complaint.address,
                user: complaint.user_id
            });
            
            // Always store for later processing - the dedicated useEffect will handle it
            console.log('Storing complaint for processing when map is ready');
            window.pendingComplaints = window.pendingComplaints || [];
            window.pendingComplaints.push(complaint);
            console.log(`Total pending complaints: ${window.pendingComplaints.length}`);
        });

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                console.log('Cleaning up socket connection');
                socketRef.current.off('newComplaint');
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Set up newComplaint listener when map becomes ready
    useEffect(() => {
        const setupListener = async () => {
            if (socketRef.current && mapReady && mapRef.current && userLocation) {
                console.log('Setting up newComplaint listener - map is ready');
                
                // Remove any existing listener
                socketRef.current.off('newComplaint');
                
                // Add the new listener for immediate processing
                socketRef.current.on('newComplaint', (complaint) => {
                    console.log('🔴 [SOCKET] Received live complaint:', complaint?._id || '(no id)');
                    console.log(complaint);
                    processNewComplaint(complaint);
                    
                    // Also update the right panel complaints
                    if (setComplaints) {
                        setComplaints(prevComplaints => [complaint, ...prevComplaints]);
                    }
                });
                
                // Process any pending complaints
                if (window.pendingComplaints && window.pendingComplaints.length > 0) {
                    console.log(`[mapReady] Processing ${window.pendingComplaints.length} pending complaint(s)...`);
                    window.pendingComplaints.forEach(complaint => {
                        processNewComplaint(complaint);
                    });
                    window.pendingComplaints = []; // Clear the pending complaints
                }
            }
        };
        
        setupListener();
    }, [mapReady, userLocation]);

    // Function to process new complaints (can be used both for live and pending complaints)
    const processNewComplaint = async (complaint) => {
        if (!mapRef.current || !userLocation) {
            console.log('Map or location not available for processing complaint');
            return;
        }

        // Check if this complaint is already being displayed to prevent duplicates
        const existingComplaint = recentComplaints.find(existing => existing.id === complaint._id);
        if (existingComplaint) {
            console.log('Complaint already exists, skipping duplicate:', complaint._id);
            return;
        }

        // Also check if marker already exists on map
        const existingMarker = incidentMarkersRef.current.find(marker => 
            marker.complaintId === complaint._id
        );
        if (existingMarker) {
            console.log('Marker for complaint already exists on map, skipping:', complaint._id);
            return;
        }

    console.log('[PROCESS] Processing complaint:', complaint?._id || '(no id)', 'Category:', complaint?.category);
        console.log('User location:', userLocation);
    const complaintCoords = getComplaintCoordinates(complaint);
    console.log('Complaint raw location payload:', complaintCoords);

        // Calculate distance between user and complaint
        const calculateDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371; // Radius of the Earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            complaintCoords.lat, 
            complaintCoords.lng
        );

        console.log(`Distance from user to complaint: ${distance.toFixed(2)} km`);

        // Debug mode - temporarily show all complaints regardless of distance
        const DEBUG_MODE = true; // Set to false for production
        const MAX_DISTANCE_KM = 100;
        
        if (!DEBUG_MODE && distance > MAX_DISTANCE_KM) {
            console.log(`Complaint is too far away (${distance.toFixed(2)} km > ${MAX_DISTANCE_KM} km), skipping`);
            return;
        }

        if (DEBUG_MODE) {
            console.log(`🔧 DEBUG MODE: Showing complaint regardless of distance (${distance.toFixed(2)} km)`);
        } else {
            console.log('✅ Complaint is within acceptable distance, creating marker...');
        }

        // Get incident type configuration by category
        const getIncidentTypeByCategory = (category) => {
            const typeMap = {
                'rail': { type: 'rail', icon: '🚂', color: '#f59e0b' },
                'fire': { type: 'fire', icon: '🔥', color: '#ef4444' },
                'cyber': { type: 'cyber', icon: '💻', color: '#8b5cf6' },
                'police': { type: 'police', icon: '👮', color: '#3b82f6' },
                'court': { type: 'court', icon: '⚖️', color: '#10b981' },
                'road': { type: 'police', icon: '🚗', color: '#3b82f6' }
            };
            return typeMap[category] || typeMap['police'];
        };

        const incidentType = getIncidentTypeByCategory(complaint.category);

        // Robustly extract coordinates and coerce to numbers
        const finalCoords = getComplaintCoordinates(complaint);
        const parsedLat = finalCoords.lat;
        const parsedLng = finalCoords.lng;

        console.log('🗺️ Coordinate extraction:', {
            coordinates: finalCoords,
            types: { lat: typeof parsedLat, lng: typeof parsedLng }
        });

        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
            console.warn('[process] Skipping: invalid coordinates', { finalCoords, complaintId: complaint?._id });
            return;
        }

        // Validate coordinate ranges (basic sanity check)
        if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
            console.warn('[process] Skipping: coordinates out of valid range', { lat: parsedLat, lng: parsedLng, complaintId: complaint?._id });
            return;
        }

        const newIncident = {
            lat: parsedLat,
            lng: parsedLng,
            id: complaint._id,
            timestamp: new Date(complaint.createdAt),
            title: complaint.title,
            description: complaint.description,
            category: complaint.category,
            severity: complaint.severity,
            status: complaint.status,
            address: complaint.address,
            user: complaint.user_id ? {
                name: complaint.user_id.name || 'Anonymous User',
                email: complaint.user_id.email || 'No email provided',
                profileImage: complaint.user_id.profileImage || null
            } : null
        };

        console.log('Created incident object:', newIncident);

        // Create the marker directly without using stored function references
        try {
            const L = await import("leaflet");
            console.log('[process] Creating marker at', { lat: newIncident.lat, lng: newIncident.lng });
            
            // Create the marker HTML
            const markerHtml = `
                <div class="incident-marker ${incidentType.type}-marker real-complaint">
                    <div class="marker-pulse"></div>
                    <div class="marker-icon">${incidentType.icon}</div>
                </div>
            `;

            // Create the marker
            const marker = L.marker([newIncident.lat, newIncident.lng], {
                icon: L.divIcon({
                    html: markerHtml,
                    className: 'custom-incident-marker',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20], // Center the icon properly
                    popupAnchor: [0, -20] // Position popup above the marker
                })
            }).addTo(mapRef.current);

            console.log('✅ Marker created successfully at coordinates:', [newIncident.lat, newIncident.lng]);

            // Force map invalidation to ensure marker appears correctly
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                }
            }, 100);

            // Calculate distance
            const distance = Math.sqrt(
                Math.pow((userLocation.lat - newIncident.lat) * 111, 2) + 
                Math.pow((userLocation.lng - newIncident.lng) * 111 * Math.cos(userLocation.lat * Math.PI / 180), 2)
            );

            console.log('� Distance calculated:', distance.toFixed(2), 'km');

            // Create popup content
            const reportedTime = newIncident.timestamp.toLocaleString();
            const timeDiff = Math.floor((new Date() - newIncident.timestamp) / (1000 * 60)); // minutes ago
            const timeAgo = timeDiff < 1 ? 'Just now' : timeDiff < 60 ? `${timeDiff}m ago` : `${Math.floor(timeDiff / 60)}h ago`;
            
            const popupContent = `
                <div class="incident-popup real-complaint-popup">
                    <div class="popup-header">
                        <div class="header-left">
                            <h3 class="incident-title">🚨 ${newIncident.title}</h3>
                            <span class="incident-category">${newIncident.category.charAt(0).toUpperCase() + newIncident.category.slice(1)}</span>
                        </div>
                        <div class="header-right">
                            <span class="live-badge">🔴 LIVE</span>
                            ${complaint.priority && complaint.priority > 1 ? `<span class="priority-badge priority-${complaint.priority}">P${complaint.priority}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="popup-body">
                        <div class="incident-details">
                            <p class="description">📝 ${newIncident.description}</p>
                            
                            <div class="status-row">
                                <span class="severity-badge severity-${newIncident.severity}">${newIncident.severity.toUpperCase()}</span>
                                <span class="status-badge status-${newIncident.status}">${newIncident.status.replace('_', ' ').toUpperCase()}</span>
                                ${complaint.level ? `<span class="level-badge level-${complaint.level}">Level ${complaint.level}</span>` : ''}
                            </div>
                            
                            ${newIncident.address ? `<p class="address">📍 ${newIncident.address}</p>` : ''}
                            
                            ${complaint.assignedDepartment ? `<p class="assignment">🏢 Assigned to: ${complaint.assignedDepartment}</p>` : ''}
                        </div>
                        
                        ${newIncident.user ? `
                            <div class="user-section">
                                <div class="user-info">
                                    ${newIncident.user.profileImage ? 
                                        `<img src="${newIncident.user.profileImage}" alt="${newIncident.user.name}" class="user-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                         <div class="user-avatar-placeholder" style="display:none;">${newIncident.user.name ? newIncident.user.name.charAt(0).toUpperCase() : '?'}</div>` : 
                                        `<div class="user-avatar-placeholder">${newIncident.user.name ? newIncident.user.name.charAt(0).toUpperCase() : '?'}</div>`
                                    }
                                    <div class="user-details">
                                        <p class="user-name">${newIncident.user.name || 'Anonymous User'}</p>
                                        ${newIncident.user.email ? `<p class="user-email">${newIncident.user.email}</p>` : ''}
                                        <p class="user-id">ID: ${newIncident.user._id || 'Unknown'}</p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${(complaint.upvote > 0 || complaint.downvote > 0) ? `
                            <div class="engagement-section">
                                <div class="vote-info">
                                    <span class="upvotes">👍 ${complaint.upvote || 0}</span>
                                    <span class="downvotes">👎 ${complaint.downvote || 0}</span>
                                    ${complaint.votedUsers && complaint.votedUsers.length > 0 ? `<span class="total-voters">${complaint.votedUsers.length} voted</span>` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${(complaint.evidence_ids && complaint.evidence_ids.length > 0) || (complaint.feedback_ids && complaint.feedback_ids.length > 0) ? `
                            <div class="attachments-section">
                                ${complaint.evidence_ids && complaint.evidence_ids.length > 0 ? `<span class="evidence-count">📎 ${complaint.evidence_ids.length} Evidence</span>` : ''}
                                ${complaint.feedback_ids && complaint.feedback_ids.length > 0 ? `<span class="feedback-count">💬 ${complaint.feedback_ids.length} Feedback</span>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="incident-meta">
                            <div class="meta-item">
                                <span class="meta-label">📏 Distance:</span>
                                <span class="meta-value">${distance.toFixed(2)} km</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">🕒 Reported:</span>
                                <span class="meta-value">${timeAgo}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">🆔 Incident ID:</span>
                                <span class="meta-value">${complaint._id}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="popup-footer">
                        <span class="live-indicator">📍 Live incident data</span>
                        <span class="report-time">Updated: ${new Date(complaint.updatedAt || complaint.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            `;

            // Add the complaint to recent complaints list (newest first)
            const complaintData = {
                ...newIncident,
                distance: distance.toFixed(2),
                timeAgo: timeDiff < 1 ? 'Just now' : timeDiff < 60 ? `${timeDiff}m ago` : `${Math.floor(timeDiff / 60)}h ago`,
                incidentType: incidentType.type,  // Use the type property
                incidentIcon: incidentType.icon,   // Also store the icon
                // Enhanced user information from WebSocket
                user: complaint.user_id ? {
                    _id: complaint.user_id._id,
                    name: complaint.user_id.name || 'Anonymous User',
                    email: complaint.user_id.email || 'No email provided',
                    profileImage: complaint.user_id.profileImage || null
                } : null,
                // Additional complaint metadata
                priority: complaint.priority || 1,
                upvote: complaint.upvote || 0,
                downvote: complaint.downvote || 0,
                level: complaint.level || 1,
                votedUsers: complaint.votedUsers || [],
                assignedDepartment: complaint.assignedDepartment,
                assigned_officer_id: complaint.assigned_officer_id,
                evidence_ids: complaint.evidence_ids || [],
                feedback_ids: complaint.feedback_ids || []
            };

            // Update recent complaints (keep only latest 10)
            setRecentComplaints(prevComplaints => {
                const updatedComplaints = [complaintData, ...prevComplaints];
                return updatedComplaints.slice(0, 10); // Keep only latest 10
            });

            // Store the marker with complaint ID for duplicate checking
            marker.complaintId = complaint._id;
            incidentMarkersRef.current.push(marker);
            
            console.log('✅ Marker added to map successfully!');
            console.log('� Total markers on map:', incidentMarkersRef.current.length);
            
            // Force immediate render so the marker appears at the correct spot without user interaction
            // Some layouts/animations can defer Leaflet's pixel calculations until a move/zoom.
            Promise.resolve().then(() => {
                try {
                    if (!mapRef.current) return;
                    
                    // Update marker if needed
                    if (marker && typeof marker.update === 'function') {
                        marker.update();
                    }
                    
                    // Force map to recalculate its size and rendering
                    mapRef.current.invalidateSize(true);
                    
                    // Small pan to force coordinate recalculation
                    const currentCenter = mapRef.current.getCenter();
                    mapRef.current.panTo([currentCenter.lat + 0.0001, currentCenter.lng + 0.0001]);
                    mapRef.current.panTo([currentCenter.lat, currentCenter.lng]);
                    
                    console.log('🗺️ Map refreshed and marker position validated');
                } catch (e) {
                    console.warn('Map refresh failed:', e);
                }
            });
            
            // Check if marker is visible in current view
            const markerLatLng = marker.getLatLng();
            const currentBounds = mapRef.current.getBounds();
            const isInCurrentView = currentBounds.contains(markerLatLng);
            
            if (!isInCurrentView) {
                console.log('📍 Panning map to show new complaint...');
                mapRef.current.panTo(markerLatLng);
            }

            // Add entrance animation
            setTimeout(() => {
                const markerElement = marker.getElement();
                if (markerElement) {
                    markerElement.style.animation = 'markerBounce 0.6s ease-out';
                    markerElement.style.transform = 'scale(1.2)';
                    
                    setTimeout(() => {
                        markerElement.style.transform = 'scale(1)';
                        markerElement.style.animation = '';
                    }, 600);
                }
            }, 100);

            console.log('🎉 New complaint marker successfully displayed on map!');
            
        } catch (error) {
            console.error('❌ Error creating marker:', error);
        }
    };

    // Request location immediately when component mounts
    useEffect(() => {
        console.log("🚀 Home component mounted - requesting location immediately");
        if (!userLocation && !locationPermission) {
            console.log("📍 Initiating location request...");
            requestLocationPermission();
        }
    }, []); // Run only once on mount

    useEffect(() => {
        console.log("Home component - checking authentication");
        const token = localStorage.getItem("token");
        console.log("Token exists:", !!token);
        console.log("Current user:", user);
        console.log("isAuthenticated:", isAuthenticated);
        console.log("Loading:", loading);
        console.log("Has loaded user:", hasLoadedUser.current);
        
        // Always try to load user data if we have a token and haven't loaded yet
        // This ensures user data is loaded/refreshed on every page reload
        if (token && !loading && !hasLoadedUser.current) {
            console.log("Token found, loading/refreshing user data...");
            hasLoadedUser.current = true;
            dispatch(loadUser())
                .unwrap()
                .then((userData) => {
                    console.log("✅ User loaded successfully:", userData);
                })
                .catch((error) => {
                    console.error("❌ Failed to load user:", error);
                    hasLoadedUser.current = false; // Reset on error
                    // Token might be invalid, clear it
                    localStorage.removeItem('token');
                    localStorage.removeItem('isLoggedIn');
                });
        } else if (!token) {
            console.log("No token found, user not authenticated");
            hasLoadedUser.current = false; // Reset
        }
    }, [dispatch, user, loading, isAuthenticated]);

    // Periodic refresh of nearby complaints every 5 minutes
    useEffect(() => {
        if (!userLocation || !mapReady) {
            return;
        }

        // Set up interval to refresh nearby complaints every 5 minutes
        const refreshInterval = setInterval(() => {
            console.log('🔄 [REFRESH] Refreshing nearby complaints...');
            dispatch(getNearbyComplaints({ latitude: userLocation.lat, longitude: userLocation.lng }))
                .unwrap()
                .then((nearbyComplaints) => {
                    console.log('🔄 [REFRESH] Nearby complaints refreshed:', nearbyComplaints?.length || 0, 'complaints found');
                    
                    if (nearbyComplaints && nearbyComplaints.length > 0) {
                        console.log('🔄 [REFRESH] Complaint IDs found:', nearbyComplaints.map(c => c._id));
                        nearbyComplaints.forEach((complaint, index) => {
                            console.log(`🔄 [REFRESH] Processing complaint ${index + 1}/${nearbyComplaints.length}:`, complaint._id, '- Title:', complaint.title);
                            processNewComplaint(complaint);
                        });
                    } else {
                        console.log('🔄 [REFRESH] No complaints found during refresh');
                    }
                })
                .catch((error) => {
                    console.error('🔄 [REFRESH] Failed to refresh nearby complaints:', error);
                });
        }, 5 * 60 * 1000); // 5 minutes

        // Clean up interval on unmount
        return () => {
            clearInterval(refreshInterval);
        };
    }, [userLocation, mapReady, dispatch]);

    // Handle map active state changes
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        
        if (isMapActive) {
            // Enable zoom interactions when map is active
            if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
            if (map.doubleClickZoom) map.doubleClickZoom.enable();
            if (map.touchZoom) map.touchZoom.enable();
            console.log('🗺️ Map activated - zoom enabled');
        } else {
            // Disable zoom interactions when map is inactive
            if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
            if (map.doubleClickZoom) map.doubleClickZoom.disable();
            if (map.touchZoom) map.touchZoom.disable();
            console.log('🗺️ Map deactivated - zoom disabled');
        }
    }, [isMapActive]);

    // Map initialization useEffect - runs when userLocation is available
    useEffect(() => {
        if (!userLocation) {
            console.log("User location not available yet, skipping map initialization");
            return;
        }

        console.log("Initializing map with user location:", userLocation);
        
        let map;
        let incidentMarkers = [];
        let userLocationMarker;
        
        const incidentTypes = [
            { type: 'rail', icon: '🚂', color: '#f59e0b' },
            { type: 'fire', icon: '🔥', color: '#ef4444' },
            { type: 'cyber', icon: '💻', color: '#8b5cf6' },
            { type: 'police', icon: '👮', color: '#3b82f6' },
            { type: 'court', icon: '⚖️', color: '#10b981' }
        ];

        const loadMap = async () => {
            try {
                const L = await import("leaflet");
                const mapElement = document.getElementById("live-map");
                if (!mapElement) {
                    console.log("Map element not found, retrying...");
                    return;
                }

                // Clean up existing map if any
                if (mapRef.current) {
                    console.log("Cleaning up existing map...");
                    if (mapRef.current._incidentInterval) {
                        clearInterval(mapRef.current._incidentInterval);
                    }
                    mapRef.current.remove();
                    mapRef.current = null;
                }
                
                // Initialize map with user's location
                map = L.map("live-map", {
                    scrollWheelZoom: false, // Disable scroll wheel zoom by default
                    doubleClickZoom: false, // Disable double click zoom when inactive
                    touchZoom: false, // Disable touch zoom when inactive
                    dragging: true, // Keep dragging enabled
                    zoomControl: true // Enable zoom control buttons
                }).setView([userLocation.lat, userLocation.lng], 13);
                mapRef.current = map;
                
                // Force initial size calculation
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize();
                        console.log('🗺️ Map size invalidated after initialization');
                    }
                }, 100);
                
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);

                // Add click handler to deactivate map when clicking on empty space
                map.on('click', function(e) {
                    // Only deactivate if map is active and click is not on a marker
                    const clickedElement = e.originalEvent.target;
                    const isMarkerClick = clickedElement.closest('.leaflet-marker-icon') || 
                                         clickedElement.closest('.leaflet-popup');
                    
                    if (!isMarkerClick) {
                        setIsMapActive(false);
                    }
                });

                // (Reverted) No additional whenReady/resize logic
                // Add user location marker
                const userMarkerHtml = `
                    <div class="user-location-marker">
                        <div class="user-pulse"></div>
                        <div class="user-icon">🎯</div>
                    </div>
                `;

                userLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
                    icon: L.divIcon({
                        html: userMarkerHtml,
                        className: 'custom-user-marker',
                        iconSize: [50, 50],
                        iconAnchor: [25, 25]
                    })
                }).addTo(map);

                const userPopupContent = isAuthenticated && user ? 
                    `<div class="user-popup">
                        <h3>🎯 ${user.name}'s Location</h3>
                        <p><strong>Status:</strong> <span class="status-active">Live Tracking</span></p>
                        <p><strong>Emergency Services:</strong> Available</p>
                        <p><strong>Location Accuracy:</strong> ${locationPermission === 'granted' ? 'High' : 'Approximate'}</p>
                    </div>` :
                    `<div class="user-popup">
                        <h3>🎯 Your Current Location</h3>
                        <p><strong>Status:</strong> <span class="status-active">Live Tracking</span></p>
                        <p><strong>Emergency Services:</strong> Available</p>
                        <p><strong>Location Accuracy:</strong> ${locationPermission === 'granted' ? 'High' : 'Approximate'}</p>
                    </div>`;

                userLocationMarker.bindPopup(userPopupContent).openPopup();

                // Create animated markers for incidents
                const createIncidentMarker = (incident, type, isRealComplaint = false) => {
                    const markerHtml = `
                        <div class="incident-marker ${type.type}-marker ${isRealComplaint ? 'real-complaint' : ''}">
                            <div class="marker-pulse"></div>
                            <div class="marker-icon">${type.icon}</div>
                        </div>
                    `;

                    const marker = L.marker([incident.lat, incident.lng], {
                        icon: L.divIcon({
                            html: markerHtml,
                            className: 'custom-incident-marker',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        })
                    }).addTo(map);

                    const distance = calculateDistance(userLocation.lat, userLocation.lng, incident.lat, incident.lng);

                    // Create different popup content for real complaints vs simulated ones
                    let popupContent;
                    if (isRealComplaint) {
                        // More detailed popup for real complaints
                        const reportedTime = incident.timestamp.toLocaleString();
                        const timeDiff = Math.floor((new Date() - incident.timestamp) / (1000 * 60)); // minutes ago
                        const timeAgo = timeDiff < 1 ? 'Just now' : timeDiff < 60 ? `${timeDiff}m ago` : `${Math.floor(timeDiff / 60)}h ago`;
                        
                        popupContent = `
                            <div class="incident-popup real-complaint-popup">
                                <div class="popup-header">
                                    <h3>🚨 ${incident.title}</h3>
                                    <span class="live-badge">🔴 LIVE</span>
                                </div>
                                
                                <div class="popup-content">
                                    <div class="complaint-details">
                                        <p><strong>� Category:</strong> ${incident.category.charAt(0).toUpperCase() + incident.category.slice(1)}</p>
                                        <p><strong>📝 Description:</strong> ${incident.description}</p>
                                        <p><strong>🎯 Severity:</strong> <span class="severity-${incident.severity}">${incident.severity.toUpperCase()}</span></p>
                                        <p><strong>📊 Status:</strong> <span class="status-${incident.status}">${incident.status.replace('_', ' ').toUpperCase()}</span></p>
                                        ${incident.address ? `<p><strong>📍 Address:</strong> ${incident.address}</p>` : ''}
                                    </div>
                                    
                                    ${incident.user ? `
                                        <div class="user-details">
                                            <hr class="popup-divider">
                                            <h4>👤 Reported by:</h4>
                                            <div class="user-info">
                                                ${incident.user.profileImage ? 
                                                    `<img src="${incident.user.profileImage}" alt="${incident.user.name}" class="user-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                                     <div class="user-avatar-placeholder" style="display:none;">${incident.user.name ? incident.user.name.charAt(0).toUpperCase() : '?'}</div>` : 
                                                    `<div class="user-avatar-placeholder">${incident.user.name ? incident.user.name.charAt(0).toUpperCase() : '?'}</div>`
                                                }
                                                <div class="user-text">
                                                    <p class="user-name">${incident.user.name || 'Anonymous User'}</p>
                                                    ${incident.user.email ? `<p class="user-email">${incident.user.email}</p>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    <div class="incident-meta">
                                        <hr class="popup-divider">
                                        <p><strong>📏 Distance:</strong> ${distance.toFixed(2)} km from you</p>
                                        <p><strong>🕒 Reported:</strong> ${timeAgo}</p>
                                        <p class="incident-id"><strong>🆔 ID:</strong> ${incident.id}</p>
                                    </div>
                                    
                                    <div class="popup-footer">
                                        <span class="real-time-indicator">📍 Live incident data</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        popupContent = `
                            <div class="incident-popup">
                                <h3>${type.type.charAt(0).toUpperCase() + type.type.slice(1)} Incident</h3>
                                <p><strong>Type:</strong> ${type.type}</p>
                                <p><strong>Distance:</strong> ${distance.toFixed(2)} km from you</p>
                                <p><strong>Time:</strong> ${incident.timestamp.toLocaleTimeString()}</p>
                                <p><strong>Status:</strong> <span class="status-active">Active</span></p>
                            </div>
                        `;
                    }

                    marker.bindPopup(popupContent);

                    return marker;
                };

                // Calculate distance between two coordinates
                const calculateDistance = (lat1, lng1, lat2, lng2) => {
                    const R = 6371; // Radius of the Earth in km
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLng = (lng2 - lng1) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return R * c;
                };

                // Store reference to createIncidentMarker function for use in socket listener
                window.createIncidentMarkerRef = createIncidentMarker;
                
                // Store reference to calculateDistance function for use in socket listener  
                window.calculateDistanceRef = calculateDistance;

                console.log('Map loaded successfully with user location:', userLocation);
                setMapReady(true);
                
                // Fetch nearby complaints from the past 30 minutes
                console.log('Fetching nearby complaints...');
                dispatch(getNearbyComplaints({ latitude: userLocation.lat, longitude: userLocation.lng }))
                    .unwrap()
                    .then((nearbyComplaints) => {
                        console.log('Nearby complaints fetched successfully:', nearbyComplaints);
                        console.log('📊 [NEARBY COMPLAINTS SUMMARY]');
                        console.log('Total nearby complaints found:', nearbyComplaints?.length || 0);
                        
                        // Log detailed information about each complaint
                        if (nearbyComplaints && nearbyComplaints.length > 0) {
                            console.log('📋 [DETAILED COMPLAINTS LIST]');
                            nearbyComplaints.forEach((complaint, index) => {
                                console.log(`\n--- Complaint ${index + 1} ---`);
                                console.log('ID:', complaint._id);
                                console.log('Title:', complaint.title);
                                console.log('Description:', complaint.description);
                                console.log('Category:', complaint.category);
                                console.log('Severity:', complaint.severity);
                                console.log('Status:', complaint.status);
                                console.log('Address:', complaint.address);
                                console.log('Created At:', complaint.createdAt);
                                console.log('Updated At:', complaint.updatedAt);
                                if (complaint.location) {
                                    if (complaint.location.coordinates) {
                                        console.log('Location (GeoJSON):', complaint.location);
                                        console.log('Coordinates [lng, lat]:', complaint.location.coordinates);
                                    } else if (complaint.latitude && complaint.longitude) {
                                        console.log('Location (Legacy):', { lat: complaint.latitude, lng: complaint.longitude });
                                    }
                                }
                                if (complaint.user_id) {
                                    console.log('Reporter:', {
                                        id: complaint.user_id._id || complaint.user_id,
                                        name: complaint.user_id.name || 'Unknown',
                                        email: complaint.user_id.email || 'Unknown'
                                    });
                                }
                                console.log('Upvotes:', complaint.upvote || 0);
                                console.log('Downvotes:', complaint.downvote || 0);
                                console.log('Priority:', complaint.priority || 1);
                                console.log('---');
                            });
                            
                            console.log('\n🔄 [PROCESSING] Starting to process complaints on map...');
                            nearbyComplaints.forEach((complaint, index) => {
                                console.log(`🗂️ [API] Processing nearby complaint ${index + 1}/${nearbyComplaints.length}:`, complaint._id);
                                processNewComplaint(complaint);
                            });
                        } else {
                            console.log('No nearby complaints found in the past 30 minutes');
                        }
                    })
                    .catch((error) => {
                        console.error('Failed to fetch nearby complaints:', error);
                    });
                
                // Process any pending complaints that arrived before map was ready
                if (window.pendingComplaints && window.pendingComplaints.length > 0) {
                    console.log(`Processing ${window.pendingComplaints.length} pending complaints...`);
                    window.pendingComplaints.forEach(complaint => {
                        processNewComplaint(complaint);
                    });
                    window.pendingComplaints = []; // Clear the pending complaints
                }
                
            } catch (error) {
                console.error('Error loading map:', error);
                setMapReady(false);
            }
        };
        
        // Add a small delay to ensure DOM is ready
        setTimeout(loadMap, 100);
        
        return () => {
            // Clean up stored function references
            window.createIncidentMarkerRef = null;
            window.calculateDistanceRef = null;
            window.pendingComplaints = [];
            
            // Clean up map
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            
            // Clean up marker references
            incidentMarkersRef.current = [];
            
            // Reset map state
            setMapReady(false);
            setIsMapActive(false);
        };
    }, [userLocation, isAuthenticated, user, locationPermission]); // Dependencies: userLocation, auth state

    // Show loading only while authentication is loading, not for location
    if (loading) return (
        <div className="home-loading-container">
            <div className="home-loading-content">
                <div className="home-loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
                <div className="home-loading-text">
                    <h2>Loading Rescue</h2>
                    <p>Preparing your dashboard...</p>
                </div>
                <div className="home-loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Navbar */}
            <Navbar />

            {/* Home Page Wrapper */}
            <div className="home-page">
                {/* Hero Section */}
                <div className="main-content">
                    <section className="hero-section">
                        <div className="hero-content">
                            <h1 className="hero-title">Report. Track. Rescue.</h1>
                            <p className="hero-subtitle">Get help or help others by reporting incidents in real-time.</p>
                            <button className="report-incident-btn" onClick={() => navigate('/complain')}>
                                <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Report Incident
                                <div className="btn-glow"></div>
                            </button>
                        </div>
                        <div className="hero-background">
                            <div className="floating-elements">
                                <div className="floating-element element-1"></div>
                                <div className="floating-element element-2"></div>
                                <div className="floating-element element-3"></div>
                                <div className="floating-element element-4"></div>
                            </div>
                        </div>
                    </section>

                {/* Live Incidents Split Layout */}
                <section className="incidents-section">
                    {/* Category Filter Tab Bar */}
                    <div className="category-tabs">
                        <div className="tabs-container">
                            <button 
                                className={`tab ${selectedCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('all')}
                            >
                                <span className="tab-icon"><FiAlertTriangle /></span>
                                All Reports
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'rail' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('rail')}
                            >
                                <span className="tab-icon" style={{color: '#fde047'}}><MdTrain /></span>
                                Rail
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'fire' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('fire')}
                            >
                                <span className="tab-icon" style={{color: '#fb7185'}}><MdLocalFireDepartment /></span>
                                Fire
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'cyber' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('cyber')}
                            >
                                <span className="tab-icon" style={{color: '#e879f9'}}><FiAlertTriangle /></span>
                                Cyber
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'police' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('police')}
                            >
                                <span className="tab-icon" style={{color: '#7dd3fc'}}><FiShield /></span>
                                Police
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'court' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('court')}
                            >
                                <span className="tab-icon" style={{color: '#4ade80'}}><MdBalance /></span>
                                Court
                            </button>
                        </div>
                    </div>

                    <div className="incidents-container">
                        {/* Left Side - Map */}
                        <div className="map-panel">
                            <div className="home-map-glass-container">
                                {/* Location Permission Status */}
                                {locationPermission === 'denied' && (
                                    <div className="location-permission-banner">
                                        <svg className="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div className="permission-text">
                                            <p>Location access denied. Showing approximate area.</p>
                                            <button 
                                                className="retry-location-btn"
                                                onClick={() => {
                                                    setLocationPermission(null);
                                                    setUserLocation(null);
                                                    requestLocationPermission();
                                                }}
                                            >
                                                Enable Location
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {userLocation ? (
                                    <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: '300px' }}>
                                        <div 
                                            id="live-map" 
                                            className={`home-live-map-container ${isMapActive ? 'map-active' : 'map-inactive'}`}
                                        ></div>
                                        
                                        {/* Event blocker overlay - blocks all map interactions when inactive */}
                                        {!isMapActive && (
                                            <div 
                                                className="map-event-blocker"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMapActive(true);
                                                }}
                                            >
                                                {/* Message overlay inside blocker */}
                                                <div className="map-inactive-message">
                                                    <svg className="map-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                    </svg>
                                                    <span>Click to activate map zoom</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="home-map-loading-container">
                                        <div className="home-map-loading-spinner"></div>
                                        <p>Loading map with your location...</p>
                                    </div>
                                )}
                                
                                <div className="home-live-indicator">
                                    <div className="pulse-dot"></div>
                                    <span>
                                        {complaintsLoading ? 'Loading complaints...' : 
                                         mapReady ? 'Live Updates' : 'Preparing map...'}
                                        {mapReady && !complaintsLoading ? '' : '...'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Complaint Details */}
                        <div className="home-complaints-section">
                            <div className="home-complaints-header">
                                <h3 className="home-complaints-title">Live Reports</h3>
                                <p className="home-complaints-subtitle">Recent incidents in your area</p>
                            </div>
                            <div className="home-complaints-panel">
                                <div className="home-complaints-list">
                                {filteredComplaints.length > 0 ? (
                                    filteredComplaints.map((complaint, index) => (
                                        <div key={`${complaint._id}-${index}`} className="home-live-complaint-card">
                                            <div className="home-card-header">
                                                <div className="home-incident-info">
                                                    <span className="home-incident-icon">
                                                        {complaint.category === 'rail' && <MdTrain style={{color: '#fde047'}} />}
                                                        {complaint.category === 'road' && <MdConstruction style={{color: '#fb7185'}} />}
                                                        {complaint.category === 'fire' && <MdLocalFireDepartment style={{color: '#fb7185'}} />}
                                                        {complaint.category === 'cyber' && <FiAlertTriangle style={{color: '#e879f9'}} />}
                                                        {complaint.category === 'police' && <FiShield style={{color: '#7dd3fc'}} />}
                                                        {complaint.category === 'court' && <MdBalance style={{color: '#4ade80'}} />}
                                                        {!complaint.category && <FiAlertTriangle style={{color: '#ffffff'}} />}
                                                    </span>
                                                    <span className="home-incident-type">
                                                        {complaint.incidentType ? 
                                                            String(complaint.incidentType).toUpperCase() : 
                                                            'INCIDENT'
                                                        }
                                                    </span>
                                                    {/* Priority indicator */}
                                                    {complaint.priority && complaint.priority > 1 && (
                                                        <span className={`home-priority-badge priority-${complaint.priority}`}>
                                                            P{complaint.priority}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="home-time-badge">{complaint.timeAgo}</span>
                                            </div>
                                            
                                            <h3 className="home-card-title">{complaint.title}</h3>
                                            <p className="home-card-description">{complaint.description}</p>
                                            
                                            {/* Enhanced address display */}
                                            <div className="home-card-content">
                                            {complaint.address && (
                                                <div className="home-address-section">
                                                    <span className="home-address-icon"><MdLocationOn /></span>
                                                    <span className="home-address-text">{complaint.address}</span>
                                                </div>
                                            )}
                                            
                                            <div className="home-card-meta">
                                                <div className="home-meta-item">
                                                    <span className="home-meta-icon"><MdLocationOn /></span>
                                                    <span>{complaint.distance} km away</span>
                                                </div>
                                                <div className="home-meta-item">
                                                    <span className="home-meta-icon"><FiAlertTriangle /></span>
                                                    <span className={`home-severity-${complaint.severity}`}>
                                                        {complaint.severity?.toUpperCase() || 'UNKNOWN'}
                                                    </span>
                                                </div>
                                                <div className="home-meta-item">
                                                    <span className="home-meta-icon"><FiAlertTriangle /></span>
                                                    <span className={`home-status-${complaint.status}`}>
                                                        {complaint.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Enhanced user information */}
                                            {complaint.user && (
                                                <div className="home-reporter-info">
                                                    <div className="home-reporter-avatar">
                                                        {complaint.user.profileImage ? (
                                                            <img 
                                                                src={complaint.user.profileImage} 
                                                                alt={complaint.user.name || 'Reporter'} 
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextElementSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <span 
                                                            className="home-avatar-placeholder"
                                                            style={{display: complaint.user.profileImage ? 'none' : 'flex'}}
                                                        >
                                                            {complaint.user.name?.charAt(0).toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div className="home-reporter-details">
                                                        <span className="home-reporter-name">
                                                            {complaint.user.name || 'Anonymous User'}
                                                        </span>
                                                        {complaint.user.email && (
                                                            <span className="home-reporter-email">
                                                                {complaint.user.email}
                                                            </span>
                                                        )}
                                                        <span className="home-reporter-label">Reported by</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Voting and engagement section */}
                                            {(complaint.upvote > 0 || complaint.downvote > 0) && (
                                                <div className="home-engagement-section">
                                                    <div className="home-vote-info">
                                                        <span className="home-upvotes">
                                                            <FiThumbsUp /> {complaint.upvote || 0}
                                                        </span>
                                                        <span className="home-downvotes">
                                                            <FiThumbsDown /> {complaint.downvote || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Department assignment info */}
                                            {complaint.assignedDepartment && (
                                                <div className="home-assignment-info">
                                                    <span className="home-assignment-icon"><MdBalance /></span>
                                                    <span className="home-assignment-text">
                                                        Assigned to: {complaint.assignedDepartment}
                                                    </span>
                                                </div>
                                            )}
                                            </div>

                                            <div className="home-card-actions">
                                                <button 
                                                    className="home-action-btn home-view-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewComplaintDetails(complaint);
                                                    }}
                                                >
                                                    <span><FiEye /></span>
                                                    View Details
                                                </button>
                                                <button className="home-action-btn home-help-btn">
                                                    <span><FiUsers /></span>
                                                    Offer Help
                                                </button>
                                                {complaint.evidence_ids && complaint.evidence_ids.length > 0 && (
                                                    <button className="home-action-btn home-evidence-btn">
                                                        <span><FiAlertTriangle /></span>
                                                        Evidence ({complaint.evidence_ids.length})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        ))
                                    ) : (
                                        <div className="home-no-complaints">
                                            <div className="home-no-complaints-icon">
                                                {selectedCategory === 'all' ? <FiAlertTriangle style={{color: '#ffffff'}} /> : 
                                                 selectedCategory === 'rail' ? <MdTrain style={{color: '#fde047'}} /> :
                                                 selectedCategory === 'fire' ? <MdLocalFireDepartment style={{color: '#fb7185'}} /> :
                                                 selectedCategory === 'cyber' ? <FiAlertTriangle style={{color: '#e879f9'}} /> :
                                                 selectedCategory === 'police' ? <FiShield style={{color: '#7dd3fc'}} /> :
                                                 selectedCategory === 'court' ? <MdBalance style={{color: '#4ade80'}} /> : <FiAlertTriangle style={{color: '#ffffff'}} />}
                                            </div>
                                            <h3>
                                                {selectedCategory === 'all' 
                                                    ? 'Listening for reports...' 
                                                    : `No ${selectedCategory} reports found`
                                                }
                                            </h3>
                                            <p>
                                                {selectedCategory === 'all' 
                                                    ? 'No recent emergency reports in your area. We\'ll show new incidents as they\'re reported.'
                                                    : `No recent ${selectedCategory} emergency reports in your area. Try selecting "All Reports" or wait for new incidents.`
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content Sections */}
                {/* <section id="rooms" className="content-section">
                    <h2>Emergency Response</h2>
                    <p>Fast and efficient emergency response services for all types of incidents.</p>
                </section>

                <section id="services" className="content-section">
                    <h2>Our Services</h2>
                    <p>Comprehensive emergency services including medical, fire, and rescue operations.</p>
                </section>

                <section id="about" className="content-section">
                    <h2>About Us</h2>
                    <p>Dedicated to protecting and serving our community with professional emergency response.</p>
                </section>

                <section id="contact" className="content-section">
                    <h2>Contact</h2>
                    <p>Get in touch for non-emergency inquiries and service information.</p>
                </section> */}
                </div>
            </div>

            <Footer />
        </>
    )
}