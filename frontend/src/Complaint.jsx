import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import "./Complaint.css";
import "./Toast.css";
import "leaflet/dist/leaflet.css";
import Navbar from "./Navbar";
import { submitComplaint, clearSuccess, clearError } from "./auth/redux/complaintSlice";

export default function Complaint() {
    const dispatch = useDispatch();
    const { isSubmitting, success, error } = useSelector((state) => state.complaints);
    const { isAuthenticated } = useSelector((state) => state.auth);
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        location: {
            latitude: null,
            longitude: null
        },
        address: ''
    });
    
    const [locationMethod, setLocationMethod] = useState('map'); // 'map', 'manual', 'current'
    const [manualLocationMethod, setManualLocationMethod] = useState('type'); // 'type', 'current'
    const [mapReady, setMapReady] = useState(false);
    const [userCurrentLocation, setUserCurrentLocation] = useState(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    const categories = [
        { value: 'rail', label: 'Rail Incidents', icon: '🚂', color: '#f59e0b' },
        { value: 'fire', label: 'Fire Emergency', icon: '🔥', color: '#ef4444' },
        { value: 'cyber', label: 'Cyber Crime', icon: '💻', color: '#8b5cf6' },
        { value: 'police', label: 'Police', icon: '👮', color: '#3b82f6' },
        { value: 'court', label: 'Court', icon: '⚖️', color: '#10b981' }
    ];

    // Get user's current location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    resolve(location);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    };

    // Initialize map for location selection
    useEffect(() => {
        if (locationMethod !== 'map') return;

        const loadMap = async () => {
            try {
                const L = await import("leaflet");
                const mapElement = document.getElementById("location-map");
                if (!mapElement) return;

                // Clean up existing map if any
                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }

                // Default to London if no user location
                const defaultLocation = userCurrentLocation || { latitude: 51.505, longitude: -0.09 };
                
                const map = L.map("location-map").setView([defaultLocation.latitude, defaultLocation.longitude], 13);
                mapRef.current = map;
                
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);

                // Add click event to map
                map.on('click', async (e) => {
                    const { lat, lng } = e.latlng;
                    
                    // Remove existing marker
                    if (markerRef.current) {
                        map.removeLayer(markerRef.current);
                    }
                    
                    // Add new marker
                    markerRef.current = L.marker([lat, lng]).addTo(map);
                    
                    // Update form data
                    setFormData(prev => ({
                        ...prev,
                        location: {
                            latitude: lat,
                            longitude: lng
                        }
                    }));
                    
                    // Try to get address using reverse geocoding
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const data = await response.json();
                        if (data && data.display_name) {
                            setFormData(prev => ({
                                ...prev,
                                address: data.display_name
                            }));
                        }
                    } catch (error) {
                        console.error('Error getting address:', error);
                    }
                });

                setMapReady(true);
            } catch (error) {
                console.error('Error loading map:', error);
            }
        };

        setTimeout(loadMap, 100);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            setMapReady(false);
        };
    }, [locationMethod, userCurrentLocation]);

    // Handle success and error states
    useEffect(() => {
        if (success) {
            toast.success('🎉 Complaint submitted successfully!', {
                duration: 4000,
                position: 'top-center',
                className: 'custom-toast custom-toast-success',
                style: {
                    background: 'rgba(16, 185, 129, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
                },
            });
            
            // Reset form
            setFormData({
                title: '',
                description: '',
                category: '',
                location: {
                    latitude: null,
                    longitude: null
                },
                address: ''
            });
            
            // Reset location method to default
            setLocationMethod('map');
            setManualLocationMethod('type');
            
            // Clear map marker if it exists
            if (markerRef.current && mapRef.current) {
                mapRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
            }
            
            // Clear success state
            dispatch(clearSuccess());
        }
        
        if (error) {
            toast.error(`❌ ${error}`, {
                duration: 5000,
                position: 'top-center',
                className: 'custom-toast custom-toast-error',
                style: {
                    background: 'rgba(239, 68, 68, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
                },
            });
            // Clear error state after showing it
            dispatch(clearError());
        }
    }, [success, error, dispatch]);

    // Get user's current location on component mount
    useEffect(() => {
        getCurrentLocation()
            .then(location => {
                setUserCurrentLocation(location);
            })
            .catch(error => {
                console.error('Error getting current location:', error);
            });
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLocationChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            location: {
                ...prev.location,
                [name]: parseFloat(value) || null
            }
        }));
    };

    const handleUseCurrentLocation = async () => {
        try {
            const location = await getCurrentLocation();
            setFormData(prev => ({
                ...prev,
                location: location
            }));
            
            toast.success('📍 Location detected successfully!', {
                duration: 3000,
                position: 'top-center',
                className: 'custom-toast custom-toast-success',
                style: {
                    background: 'rgba(59, 130, 246, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                },
            });
            
            // Try to get address
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`);
                const data = await response.json();
                if (data && data.display_name) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.display_name
                    }));
                }
            } catch (error) {
                console.error('Error getting address:', error);
            }
        } catch (error) {
            toast.error(`🌍 Error getting location: ${error.message}`, {
                duration: 4000,
                position: 'top-center',
                className: 'custom-toast custom-toast-error',
                style: {
                    background: 'rgba(239, 68, 68, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
                },
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Check if user is authenticated
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to submit a complaint', {
                duration: 4000,
                position: 'top-center',
                className: 'custom-toast custom-toast-warning',
                style: {
                    background: 'rgba(245, 158, 11, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                },
                icon: '🔐',
            });
            return;
        }
        
        // Validate form
        if (!formData.title || !formData.description || !formData.category || 
            !formData.location.latitude || !formData.location.longitude) {
            toast.error('📝 Please fill in all required fields', {
                duration: 4000,
                position: 'top-center',
                className: 'custom-toast custom-toast-warning',
                style: {
                    background: 'rgba(245, 158, 11, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                },
                icon: '⚠️',
            });
            return;
        }

        // Show submitting toast
        toast.loading('📤 Submitting your complaint...', {
            id: 'submitting',
            position: 'top-center',
            className: 'custom-toast custom-toast-loading',
            style: {
                background: 'rgba(59, 130, 246, 0.2)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#fff',
                fontWeight: '600',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
            },
        });

        // Dispatch the submitComplaint action
        const complaintData = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            location: {
                latitude: formData.location.latitude,
                longitude: formData.location.longitude,
                address: formData.address || null
            }
        };

        console.log('Dispatching submitComplaint with data:', complaintData);
        dispatch(submitComplaint(complaintData));
        
        // Dismiss the loading toast after a short delay
        setTimeout(() => {
            toast.dismiss('submitting');
        }, 1000);
    };

    return (
        <>
            <Navbar />
            <Toaster 
                position="top-center"
                reverseOrder={false}
                gutter={8}
                containerClassName="toast-container"
                containerStyle={{ zIndex: 9999 }}
                toastOptions={{
                    className: 'custom-toast',
                    duration: 4000,
                    style: {
                        background: 'rgba(30, 58, 138, 0.15)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        maxWidth: '400px',
                        padding: '16px 20px',
                    },
                    success: {
                        duration: 4000,
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                    loading: {
                        iconTheme: {
                            primary: '#3b82f6',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            
            <div className="complaint-page">
                <div className="complaint-container">
                    <div className="complaint-header">
                        <h1 className="complaint-title">Report an Incident</h1>
                        <p className="complaint-subtitle">Help us help you by providing detailed information about the incident</p>
                    </div>

                    <form onSubmit={handleSubmit} className="complaint-form">
                        {/* Title Field */}
                        <div className="form-group">
                            <label htmlFor="title" className="form-label">
                                <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Incident Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Eg. - Fire at a nearby store"
                                required
                            />
                        </div>

                        {/* Category Field */}
                        <div className="form-group">
                            <label htmlFor="category" className="form-label">
                                <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Category *
                            </label>
                            <div className="category-grid">
                                {categories.map(cat => (
                                    <label key={cat.value} className={`category-option ${formData.category === cat.value ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="category"
                                            value={cat.value}
                                            checked={formData.category === cat.value}
                                            onChange={handleInputChange}
                                            className="category-radio"
                                        />
                                        <div className="category-content">
                                            <span className="category-icon" style={{ color: cat.color }}>{cat.icon}</span>
                                            <span className="category-label">{cat.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Description Field */}
                        <div className="form-group">
                            <label htmlFor="description" className="form-label">
                                <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Description *
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="form-textarea"
                                placeholder="E.g., The fire started around 3 PM in the store’s storage area due to an electrical short circuit, causing heavy smoke and damage to nearby shops."
                                rows="5"
                                required
                            />
                        </div>

                        {/* Location Selection Method */}
                        <div className="form-group">
                            <label className="form-label">
                                <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Location *
                            </label>
                            <div className="location-methods">
                                <label className={`location-method ${locationMethod === 'map' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="locationMethod"
                                        value="map"
                                        checked={locationMethod === 'map'}
                                        onChange={(e) => setLocationMethod(e.target.value)}
                                    />
                                    <span>Select on Map</span>
                                </label>
                                <label className={`location-method ${locationMethod === 'manual' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="locationMethod"
                                        value="manual"
                                        checked={locationMethod === 'manual'}
                                        onChange={(e) => setLocationMethod(e.target.value)}
                                    />
                                    <span>Enter Manually</span>
                                </label>
                            </div>
                        </div>

                        {/* Map Location Selection */}
                        {locationMethod === 'map' && (
                            <div className="form-group">
                                <div className="map-container">
                                    <div className="map-instructions">
                                        <p>Click on the map to select the incident location</p>
                                        {formData.location.latitude && (
                                            <div className="selected-coordinates">
                                                <span>📍 {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div id="location-map" className="location-map"></div>
                                </div>
                            </div>
                        )}

                        {/* Manual Location Entry */}
                        {locationMethod === 'manual' && (
                            <div className="form-group">
                                <div className="manual-location-methods">
                                    <label className={`manual-method ${manualLocationMethod === 'type' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="manualLocationMethod"
                                            value="type"
                                            checked={manualLocationMethod === 'type'}
                                            onChange={(e) => setManualLocationMethod(e.target.value)}
                                        />
                                        <span>Type Coordinates</span>
                                    </label>
                                    <label className={`manual-method ${manualLocationMethod === 'current' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="manualLocationMethod"
                                            value="current"
                                            checked={manualLocationMethod === 'current'}
                                            onChange={(e) => setManualLocationMethod(e.target.value)}
                                        />
                                        <span>Use Current Location</span>
                                    </label>
                                </div>

                                {manualLocationMethod === 'type' && (
                                    <div className="coordinates-inputs">
                                        <div className="coordinate-group">
                                            <label htmlFor="latitude" className="coordinate-label">Latitude</label>
                                            <input
                                                type="number"
                                                id="latitude"
                                                name="latitude"
                                                value={formData.location.latitude || ''}
                                                onChange={handleLocationChange}
                                                className="coordinate-input"
                                                placeholder="e.g., 51.505"
                                                step="any"
                                                required
                                            />
                                        </div>
                                        <div className="coordinate-group">
                                            <label htmlFor="longitude" className="coordinate-label">Longitude</label>
                                            <input
                                                type="number"
                                                id="longitude"
                                                name="longitude"
                                                value={formData.location.longitude || ''}
                                                onChange={handleLocationChange}
                                                className="coordinate-input"
                                                placeholder="e.g., -0.09"
                                                step="any"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {manualLocationMethod === 'current' && (
                                    <div className="current-location-section">
                                        <button
                                            type="button"
                                            onClick={handleUseCurrentLocation}
                                            className="current-location-btn"
                                        >
                                            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                            Get Current Location
                                        </button>
                                        {formData.location.latitude && (
                                            <div className="current-coordinates">
                                                <span>📍 {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Address Field */}
                        <div className="form-group">
                            <label htmlFor="address" className="form-label">
                                <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-8 0H3m2 0h6m0 0v-3.5a2 2 0 011.732-1.732l.268-.155a2 2 0 011.732 0l.268.155A2 2 0 0014 17.5V21m-7 0V9a2 2 0 012-2h3a2 2 0 012 2v12" />
                                </svg>
                                Address
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Street address or landmark"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="form-actions">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`submit-btn animated-button ${isSubmitting ? 'submitting' : ''}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="submit-spinner"></div>
                                        <span className="submit-btn-text">Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                            <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                                                ></path>
                                            </svg>
                                            <span className="text">Submit</span>
                                            <span className="circle"></span>
                                            <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                                                ></path>
                                            </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}