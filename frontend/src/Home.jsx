import React, { useState, useEffect, useRef } from "react";
import "./Home.css";
import "leaflet/dist/leaflet.css";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { loadUser, loginSuccess, logout } from "./auth/redux/authSlice";
import Footer from "./Footer";
import Navbar from "./Navbar";

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
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const hasLoadedUser = useRef(false);
    const mapRef = useRef(null);

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
            { type: 'rail', icon: '🚂', color: '#f59e0b', incidents: [] },
            { type: 'fire', icon: '🔥', color: '#ef4444', incidents: [] },
            { type: 'cyber', icon: '💻', color: '#8b5cf6', incidents: [] },
            { type: 'police', icon: '👮', color: '#3b82f6', incidents: [] },
            { type: 'court', icon: '⚖️', color: '#10b981', incidents: [] }
        ];

        // Generate random incidents across the visible map area
        const generateIncidents = (centerLat, centerLng, count = 3) => {
            const incidents = [];
            for (let i = 0; i < count; i++) {
                // Spread incidents across a much larger area (visible map bounds)
                const lat = centerLat + (Math.random() - 0.5) * 0.2; // Increased from 0.02 to 0.2
                const lng = centerLng + (Math.random() - 0.5) * 0.2; // Increased from 0.02 to 0.2
                incidents.push({
                    lat,
                    lng,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date()
                });
            }
            return incidents;
        };

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

                // Generate incidents for each type around user location
                incidentTypes.forEach(incidentType => {
                    incidentType.incidents = generateIncidents(userLocation.lat, userLocation.lng, Math.floor(Math.random() * 4) + 3); // 3-6 incidents per type
                });

                // Create animated markers for incidents
                const createIncidentMarker = (incident, type) => {
                    const markerHtml = `
                        <div class="incident-marker ${type.type}-marker">
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

                    marker.bindPopup(`
                        <div class="incident-popup">
                            <h3>${type.type.charAt(0).toUpperCase() + type.type.slice(1)} Incident</h3>
                            <p><strong>Type:</strong> ${type.type}</p>
                            <p><strong>Distance:</strong> ${distance.toFixed(2)} km from you</p>
                            <p><strong>Time:</strong> ${incident.timestamp.toLocaleTimeString()}</p>
                            <p><strong>Status:</strong> <span class="status-active">Active</span></p>
                        </div>
                    `);

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

                // Add all incident markers
                incidentTypes.forEach(type => {
                    type.incidents.forEach(incident => {
                        const marker = createIncidentMarker(incident, type);
                        incidentMarkers.push(marker);
                    });
                });

                // Simulate live updates by adding new incidents periodically
                const addRandomIncident = () => {
                    const randomType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
                    const newIncident = generateIncidents(userLocation.lat, userLocation.lng, 1)[0];
                    
                    const marker = createIncidentMarker(newIncident, randomType);
                    incidentMarkers.push(marker);
                    
                    // Remove old incidents to keep the map clean
                    if (incidentMarkers.length > 25) {
                        const oldMarker = incidentMarkers.shift();
                        map.removeLayer(oldMarker);
                    }
                };

                // Add new incidents every 5-8 seconds for live effect
                const intervalId = setInterval(addRandomIncident, Math.random() * 3000 + 5000);

                // Store interval ID for cleanup
                map._incidentInterval = intervalId;

                console.log('Map loaded successfully with user location:', userLocation);
                setMapReady(true);
                
            } catch (error) {
                console.error('Error loading map:', error);
                setMapReady(false);
            }
        };
        
        // Add a small delay to ensure DOM is ready
        setTimeout(loadMap, 100);
        
        return () => {
            if (mapRef.current) {
                if (mapRef.current._incidentInterval) {
                    clearInterval(mapRef.current._incidentInterval);
                }
                mapRef.current.remove();
                mapRef.current = null;
            }
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

                {/* Live Incidents Map Section */}
                <section className="map-section">
                    <div className="map-glass">
                        <h2 className="map-title">Live Incidents Near You</h2>
                        <p className="map-subtitle">
                            Real-time emergency incidents in your area
                            {locationPermission === 'granted' && ' (High Accuracy)'}
                            {locationPermission === 'denied' && ' (Approximate Location)'}
                        </p>
                        
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

                        <div className="incident-legend">
                            <div className="legend-item">
                                <div className="legend-icon rail-icon">🚂</div>
                                <span>Rail Incidents</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-icon fire-icon">🔥</div>
                                <span>Fire Emergency</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-icon cyber-icon">💻</div>
                                <span>Cyber Crime</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-icon police-icon">👮</div>
                                <span>Police</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-icon court-icon">⚖️</div>
                                <span>Court</span>
                            </div>
                        </div>
                        
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