import React, { useState, useEffect, useRef } from "react";
import "./Home.css";
import "leaflet/dist/leaflet.css";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { loadUser, loginSuccess, logout } from "./auth/redux/authSlice";
import Footer from "./Footer";
import Navbar from "./Navbar";
import { io } from "socket.io-client";

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export default function Home() {
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
    const [locationPermission, setLocationPermission] = useState(null); // 'granted', 'denied', 'prompt', null
    const [userLocation, setUserLocation] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    
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

    // Function to request location permission
    const requestLocationPermission = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.log('Geolocation is not supported by this browser');
                setLocationPermission('denied');
                resolve({ lat: 51.505, lng: -0.09 }); // London fallback
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log('Location permission granted:', location);
                    setLocationPermission('granted');
                    setUserLocation(location);
                    resolve(location);
                },
                (error) => {
                    console.log('Location access denied or failed:', error);
                    setLocationPermission('denied');
                    const fallbackLocation = { lat: 51.505, lng: -0.09 }; // London fallback
                    setUserLocation(fallbackLocation);
                    resolve(fallbackLocation);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
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
                coordinates: { lat: complaint.latitude, lng: complaint.longitude },
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
                    console.log('🔴 Received live complaint:', complaint?._id || '(no id)');
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

    console.log('[process] Start processing complaint:', complaint?._id || '(no id)');
        console.log('User location:', userLocation);
    console.log('Complaint raw location payload:', { lat: complaint?.latitude, lng: complaint?.longitude });

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
            complaint.latitude, 
            complaint.longitude
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
        const rawLat = complaint?.latitude ?? complaint?.lat ?? complaint?.location?.latitude ?? complaint?.location?.lat;
        const rawLng = complaint?.longitude ?? complaint?.lng ?? complaint?.location?.longitude ?? complaint?.location?.lng;
        const parsedLat = typeof rawLat === 'string' ? parseFloat(rawLat) : rawLat;
        const parsedLng = typeof rawLng === 'string' ? parseFloat(rawLng) : rawLng;

        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
            console.warn('[process] Skipping: invalid coordinates', { rawLat, rawLng, complaintId: complaint?._id });
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
                    iconAnchor: [20, 20]
                })
            }).addTo(mapRef.current);

            console.log('✅ Marker created successfully');

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
                        <span class="live-badge">🔴 LIVE</span>
                    </div>
                    
                    <div class="popup-body">
                        <div class="incident-details">
                            <p class="description">📝 ${newIncident.description}</p>
                            
                            <div class="status-row">
                                <span class="severity-badge severity-${newIncident.severity}">${newIncident.severity.toUpperCase()}</span>
                                <span class="status-badge status-${newIncident.status}">${newIncident.status.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            
                            ${newIncident.address ? `<p class="address">📍 ${newIncident.address}</p>` : ''}
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
                                    </div>
                                </div>
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
                        </div>
                    </div>
                    
                    <div class="popup-footer">
                        <span class="live-indicator">📍 Live incident data</span>
                    </div>
                </div>
            `;

            // Add the complaint to recent complaints list (newest first)
            const complaintData = {
                ...newIncident,
                distance: distance.toFixed(2),
                timeAgo: timeDiff < 1 ? 'Just now' : timeDiff < 60 ? `${timeDiff}m ago` : `${Math.floor(timeDiff / 60)}h ago`,
                incidentType: incidentType.type,  // Use the type property
                incidentIcon: incidentType.icon   // Also store the icon
            };

            // Update recent complaints (keep only latest 10)
            setRecentComplaints(prevComplaints => {
                const updatedComplaints = [complaintData, ...prevComplaints];
                return updatedComplaints.slice(0, 10); // Keep only latest 10
            });

            // Store the marker
            incidentMarkersRef.current.push(marker);
            
            console.log('✅ Marker added to map successfully!');
            console.log('� Total markers on map:', incidentMarkersRef.current.length);
            
            // Force immediate render so the marker appears at the correct spot without user interaction
            // Some layouts/animations can defer Leaflet's pixel calculations until a move/zoom.
            Promise.resolve().then(() => {
                try {
                    if (!mapRef.current) return;
                    if (marker && typeof marker.update === 'function') {
                        marker.update();
                    }
                    // Recalculate map size and trigger a no-op movement to flush rendering
                    mapRef.current.invalidateSize(true);
                    mapRef.current.panBy([0, 0], { animate: false });
                    mapRef.current.fire('moveend');
                } catch (e) {
                    console.warn('Map redraw nudge failed:', e);
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

    useEffect(() => {
        console.log("Home component mounted - checking authentication");
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
                    console.log("User loaded successfully:", userData);
                    // Request location permission after successful login
                    if (!userLocation) {
                        console.log("Requesting location permission after login...");
                        requestLocationPermission();
                    }
                })
                .catch((error) => {
                    console.error("Failed to load user:", error);
                    hasLoadedUser.current = false; // Reset on error
                    // Token might be invalid, clear it
                    localStorage.removeItem('token');
                    localStorage.removeItem('isLoggedIn');
                });
        } else if (!token) {
            console.log("No token found, user not authenticated");
            hasLoadedUser.current = false; // Reset
            // Still request location for non-authenticated users
            if (!userLocation) {
                console.log("Requesting location permission for non-authenticated user...");
                requestLocationPermission();
            }
        }
    }, [dispatch, user, loading, userLocation]);

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
                map = L.map("live-map").setView([userLocation.lat, userLocation.lng], 13);
                mapRef.current = map;
                
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);

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
            
            setMapReady(false);
        };
    }, [userLocation, isAuthenticated, user, locationPermission]); // Dependencies: userLocation, auth state

    // Show loading while authentication is loading OR when location is not available yet
    if (loading || !userLocation) return (
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
                    <p>{loading ? 'Preparing your dashboard...' : 'Getting your location...'}</p>
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
                            <button className="report-incident-btn" onClick={() => navigate('/report')}>
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
                                <span className="tab-icon">🚨</span>
                                All Reports
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'rail' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('rail')}
                            >
                                <span className="tab-icon">🚂</span>
                                Rail
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'fire' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('fire')}
                            >
                                <span className="tab-icon">🔥</span>
                                Fire
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'cyber' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('cyber')}
                            >
                                <span className="tab-icon">💻</span>
                                Cyber
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'police' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('police')}
                            >
                                <span className="tab-icon">👮</span>
                                Police
                            </button>
                            <button 
                                className={`tab ${selectedCategory === 'court' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('court')}
                            >
                                <span className="tab-icon">⚖️</span>
                                Court
                            </button>
                        </div>
                    </div>

                    <div className="incidents-container">
                        {/* Left Side - Map */}
                        <div className="map-panel">
                            <div className="map-glass">
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
                                    <div id="live-map" className="live-map"></div>
                                ) : (
                                    <div className="map-loading">
                                        <div className="map-loading-spinner"></div>
                                        <p>Loading map with your location...</p>
                                    </div>
                                )}
                                
                                <div className="live-indicator">
                                    <div className="pulse-dot"></div>
                                    <span>Live Updates {mapReady ? '✓' : '...'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Complaint Details */}
                        <div className="complaints-panel">
                            <div className="complaints-glass">
                                <div className="complaints-list">
                                    {filteredComplaints.length > 0 ? (
                                        filteredComplaints.map((complaint, index) => (
                                            <div key={`${complaint._id}-${index}`} className="complaint-card">
                                                <div className="complaint-header">
                                                    <div className="incident-badge">
                                                        <span className={`incident-icon ${complaint.incidentType || 'unknown'}`}>
                                                            {complaint.incidentIcon || '🚨'}
                                                        </span>
                                                        <span className="incident-type">
                                                            {complaint.incidentType ? 
                                                                String(complaint.incidentType).toUpperCase() : 
                                                                'INCIDENT'
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="time-badge">
                                                        {complaint.timeAgo}
                                                    </div>
                                                </div>

                                                <div className="complaint-content">
                                                    <h3 className="complaint-title">{complaint.title}</h3>
                                                    <p className="complaint-description">{complaint.description}</p>
                                                    
                                                    <div className="complaint-meta">
                                                        <div className="meta-item">
                                                            <span className="meta-icon">📍</span>
                                                            <span>{complaint.location}</span>
                                                        </div>
                                                        <div className="meta-item">
                                                            <span className="meta-icon">📏</span>
                                                            <span>{complaint.distance} km away</span>
                                                        </div>
                                                    </div>

                                                    {complaint.user && (
                                                        <div className="reporter-info">
                                                            <div className="reporter-avatar">
                                                                {complaint.user.profilePicture ? (
                                                                    <img src={complaint.user.profilePicture} alt="Reporter" />
                                                                ) : (
                                                                    <div className="avatar-placeholder">
                                                                        {complaint.user.name?.charAt(0) || 'U'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="reporter-details">
                                                                <span className="reporter-name">{complaint.user.name || 'Anonymous'}</span>
                                                                <span className="reporter-label">Reported by</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="complaint-actions">
                                                    <button className="action-btn view-btn">
                                                        <span>👁️</span>
                                                        View
                                                    </button>
                                                    <button className="action-btn help-btn">
                                                        <span>🤝</span>
                                                        Help
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-complaints">
                                            <div className="no-complaints-icon">
                                                {selectedCategory === 'all' ? '📡' : 
                                                 selectedCategory === 'rail' ? '🚂' :
                                                 selectedCategory === 'fire' ? '🔥' :
                                                 selectedCategory === 'cyber' ? '💻' :
                                                 selectedCategory === 'police' ? '👮' :
                                                 selectedCategory === 'court' ? '⚖️' : '📡'}
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