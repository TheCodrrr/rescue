import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import { navigateProgrammatically } from './App';
import "./Complaint.css";
import "./Toast.css";
import "leaflet/dist/leaflet.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { 
  MdLocalFireDepartment,
  MdBalance,
  MdLocalHospital,
  MdWater,
  MdConstruction,
  MdWarning,
  MdElectricalServices,
  MdTrain
} from 'react-icons/md';
import { 
    submitComplaint, 
    clearSuccess, 
    clearError
} from './auth/redux/complaintSlice';

export default function Complaint() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isSubmitting, success, error } = useSelector((state) => state.complaints);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    
    // Get initial tab from URL params or default to 'register'
    const getInitialTab = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromUrl = urlParams.get('tab');
        return (tabFromUrl === 'register') ? tabFromUrl : 'register';
    };
    
    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        severity: 'medium', // Default to medium severity
        location: {
            latitude: null,
            longitude: null
        },
        address: '',
        // Rail-specific optional field (required only when category === 'rail')
        trainNumber: ''
    });
    
    const [locationMethod, setLocationMethod] = useState('map'); // 'map', 'manual', 'current'
    const [manualLocationMethod, setManualLocationMethod] = useState('type'); // 'type', 'current'
    const [mapReady, setMapReady] = useState(false);
    const [userCurrentLocation, setUserCurrentLocation] = useState(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const categories = [
        { value: 'rail', label: 'Rail Incidents', icon: <MdTrain />, color: '#f59e0b' },
        { value: 'road', label: 'Road Issues', icon: <MdConstruction />, color: '#db2777' },
        { value: 'fire', label: 'Fire Emergency', icon: <MdLocalFireDepartment />, color: '#ef4444' },
        { value: 'cyber', label: 'Cyber Crime', icon: <MdWarning />, color: '#8b5cf6' },
        { value: 'police', label: 'Police', icon: <MdWarning />, color: '#3b82f6' },
        { value: 'court', label: 'Court', icon: <MdBalance />, color: '#10b981' }
    ];

    // Get address from coordinates using reverse geocoding
    const getAddressFromCoordinates = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.9',
                        'User-Agent': 'RescueApp/1.0'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch address');
            }
            
            const data = await response.json();
            
            if (data && data.display_name) {
                // Format the address nicely
                const address = data.address || {};
                const components = [];
                
                // Build address from components in a logical order
                if (address.house_number) components.push(address.house_number);
                if (address.road) components.push(address.road);
                if (address.neighbourhood) components.push(address.neighbourhood);
                if (address.suburb) components.push(address.suburb);
                if (address.city || address.town || address.village) {
                    components.push(address.city || address.town || address.village);
                }
                if (address.state) components.push(address.state);
                if (address.postcode) components.push(address.postcode);
                
                const formattedAddress = components.length > 0 ? components.join(', ') : data.display_name;
                
                return formattedAddress;
            } else {
                return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }
        } catch (error) {
            console.error('Error fetching address:', error);
            return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
    };

    // Get user's current location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(location);
                },
                (error) => {
                    let errorMessage = 'Unknown error occurred while getting location.';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Location access denied by user.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "The request to get user location timed out.";
                            break;
                    }
                    
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    };

    // Initialize map for location selection
    useEffect(() => {
        if (locationMethod === 'map' && typeof window !== 'undefined' && activeTab === 'register') {
            import('leaflet').then((L) => {
                if (mapRef.current && !mapRef.current._leaflet_id) {
                    // Determine initial map view based on user location availability
                    let initialLat = 20.5937; // Center of India fallback
                    let initialLng = 78.9629; // Center of India fallback
                    let initialZoom = 5; // Country level zoom fallback
                    
                    // If user location is available, use it for initial view
                    if (userCurrentLocation) {
                        initialLat = userCurrentLocation.latitude;
                        initialLng = userCurrentLocation.longitude;
                        initialZoom = 13; // City level zoom when user location is available
                    }
                    
                    // Initialize map
                    const map = L.map(mapRef.current).setView([initialLat, initialLng], initialZoom);
                    
                    // Store map instance for later use
                    mapInstanceRef.current = map;
                    
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
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
                        
                        // Get address from coordinates
                        toast.loading('Getting location address...', { id: 'address-lookup' });
                        
                        try {
                            const address = await getAddressFromCoordinates(lat, lng);
                            
                            // Update form data with coordinates and address
                            setFormData(prev => ({
                                ...prev,
                                location: {
                                    latitude: lat,
                                    longitude: lng
                                },
                                address: address
                            }));
                            
                            toast.success('Location and address updated!', { id: 'address-lookup' });
                        } catch (error) {
                            // Update form data with just coordinates if address lookup fails
                            setFormData(prev => ({
                                ...prev,
                                location: {
                                    latitude: lat,
                                    longitude: lng
                                },
                                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                            }));
                            
                            toast.error('Could not fetch address, coordinates saved', { id: 'address-lookup' });
                        }
                    });

                    // If user location is available, add a marker for current location
                    if (userCurrentLocation) {
                        const { latitude, longitude } = userCurrentLocation;
                        
                        // Add a different colored marker for current location
                        L.circleMarker([latitude, longitude], {
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.5,
                            radius: 8
                        }).addTo(map).bindPopup('Your current location');
                    }
                    
                    setMapReady(true);
                }
            });
        }
    }, [locationMethod, activeTab]);

    // Update map view when user location becomes available
    useEffect(() => {
        if (mapInstanceRef.current && userCurrentLocation && locationMethod === 'map') {
            import('leaflet').then((L) => {
                const map = mapInstanceRef.current;
                const { latitude, longitude } = userCurrentLocation;
                
                // Update map view to user location with smooth animation
                map.setView([latitude, longitude], 13, { animate: true });
                
                // Add current location marker
                L.circleMarker([latitude, longitude], {
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.5,
                    radius: 8
                }).addTo(map).bindPopup('Your current location');
            });
        }
    }, [userCurrentLocation, locationMethod]);

    // Handle success and error states
    useEffect(() => {
        if (success) {
            toast.success('Complaint submitted successfully!', {
                duration: 4000,
                position: 'top-right',
            });
            
            // Reset form
            setFormData({
                title: '',
                description: '',
                category: '',
                severity: 'medium',
                location: {
                    latitude: null,
                    longitude: null
                },
                address: '',
                trainNumber: ''
            });
            
            // Clear success state
            dispatch(clearSuccess());
        }
        
        if (error) {
            toast.error(error, {
                duration: 4000,
                position: 'top-right',
            });
            
            // Clear error state
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

    // Load user complaints when switching to view tab
    useEffect(() => {
        // View functionality moved to UserProfile component
    }, []);

    // Fetch comment counts for all complaints after they are loaded
    useEffect(() => {
        // Comment fetching moved to UserProfile component
    }, []);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tabFromUrl = urlParams.get('tab');
            if (tabFromUrl === 'register' && tabFromUrl !== activeTab) {
                setActiveTab(tabFromUrl);
            }
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeTab]);

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
                [name]: value ? parseFloat(value) : null
            }
        }));
    };

    const handleUseCurrentLocation = async () => {
        try {
            toast.loading('Getting your location...', { id: 'current-location' });
            
            const location = await getCurrentLocation();
            
            // Get address from current location coordinates
            toast.loading('Getting location address...', { id: 'current-location' });
            
            try {
                const address = await getAddressFromCoordinates(location.latitude, location.longitude);
                
                setFormData(prev => ({
                    ...prev,
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    },
                    address: address
                }));
                
                toast.success('Current location and address updated!', { id: 'current-location' });
            } catch (addressError) {
                // If address lookup fails, still update coordinates
                setFormData(prev => ({
                    ...prev,
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    },
                    address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                }));
                
                toast.success('Current location selected! (Address lookup failed)', { id: 'current-location' });
            }
        } catch (error) {
            toast.error(`Error getting location: ${error.message}`, { id: 'current-location' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.title.trim()) {
            toast.error('Please enter a title for your complaint');
            return;
        }
        
        if (!formData.description.trim()) {
            toast.error('Please provide a description of the incident');
            return;
        }
        
        if (!formData.category) {
            toast.error('Please select a category');
            return;
        }
        
        if (!formData.location.latitude || !formData.location.longitude) {
            toast.error('Please select a location for the incident');
            return;
        }

        if (!formData.address.trim()) {
            toast.error('Please provide an address for the incident location');
            return;
        }

        // Rail-specific validation
        if (formData.category === 'rail' && !formData.trainNumber.trim()) {
            toast.error('Train number is required for rail incidents');
            return;
        }
        
        // Prepare complaint data
        const complaintData = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            severity: formData.severity,
            location: {
                latitude: formData.location.latitude,
                longitude: formData.location.longitude
            },
            address: formData.address.trim(),
            ...(formData.category === 'rail' && formData.trainNumber.trim() && {
                category_data_id: formData.trainNumber.trim()
            })
        };
        
        console.log("Complaint data being submitted:", complaintData);
        
        try {
            await dispatch(submitComplaint(complaintData)).unwrap();
        } catch (err) {
            // Error handling is done in useEffect
        }
    };

    // Handle tab change and update URL
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        
        // Update URL without triggering navigation
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('tab', tab);
        window.history.pushState({}, '', newUrl);
    };

    return (
        <>
            <Navbar />
            <Toaster />
            <div className="complaint-page">
                <div className="complaint-container">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button 
                            className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
                            onClick={() => handleTabChange('register')}
                        >
                            <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Register Complaint
                        </button>
                    </div>

                    {/* Register Complaint Section */}
                    {activeTab === 'register' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h2 className="section-title">Report an Incident</h2>
                                <p className="section-subtitle">Help us help you by providing detailed information about the incident</p>
                            </div>

                            <form onSubmit={handleSubmit} className="complaint-form">
                                {/* Title Field */}
                                <div className="form-group">
                                    <label htmlFor="title" className="form-label">
                                        <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                        </svg>
                                        Complaint Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Briefly describe the incident"
                                        required
                                    />
                                </div>

                                {/* Description Field */}
                                <div className="form-group">
                                    <label htmlFor="description" className="form-label">
                                        <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Detailed Description *
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="form-textarea"
                                        rows="4"
                                        placeholder="Provide detailed information about what happened, when it occurred, and any other relevant details"
                                        required
                                    />
                                </div>

                                {/* Category Selection */}
                                <div className="form-group">
                                    <label className="form-label">
                                        <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Incident Category *
                                    </label>
                                    <div className="category-grid">
                                        {categories.map((category) => (
                                            <label key={category.value} className={`category-option ${formData.category === category.value ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    value={category.value}
                                                    checked={formData.category === category.value}
                                                    onChange={handleInputChange}
                                                    className="category-radio"
                                                />
                                                <div className="category-content">
                                                    <span className="category-icon" style={{ color: category.color }}>
                                                        {category.icon}
                                                    </span>
                                                    <span className="category-label">{category.label}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Rail-specific Train Number Field */}
                                {formData.category === 'rail' && (
                                    <div className="form-group">
                                        <label htmlFor="trainNumber" className="form-label">
                                            <MdTrain className="label-icon" />
                                            Train Number *
                                        </label>
                                        <input
                                            type="text"
                                            id="trainNumber"
                                            name="trainNumber"
                                            value={formData.trainNumber}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter train number (e.g., 12345)"
                                            required
                                        />
                                    </div>
                                )}

                                {/* Severity Selection */}
                                <div className="form-group">
                                    <label className="form-label">
                                        <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Severity Level
                                    </label>
                                    <div className="severity-container">
                                        <div className="severity-options">
                                            {['low', 'medium', 'high'].map((severity) => (
                                                <label key={severity} className={`severity-option severity-${severity} ${formData.severity === severity ? 'selected' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="severity"
                                                        value={severity}
                                                        checked={formData.severity === severity}
                                                        onChange={handleInputChange}
                                                        className="severity-radio"
                                                    />
                                                    <div className="severity-card">
                                                        <div className="severity-icon-wrapper">
                                                            <div className="severity-icon">
                                                                {severity === 'low' && '🟢'}
                                                                {severity === 'medium' && '🟡'}
                                                                {severity === 'high' && '🔴'}
                                                            </div>
                                                            <div className="severity-pulse"></div>
                                                        </div>
                                                        <div className="severity-content">
                                                            <div className="severity-header">
                                                                <span className="severity-label">
                                                                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                                                                </span>
                                                                <span className={`severity-badge severity-badge-${severity}`}>
                                                                    <span className="severity-dot"></span>
                                                                    {severity.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <p className="severity-description">
                                                                {severity === 'low' && 'Minor issues with minimal impact'}
                                                                {severity === 'medium' && 'Moderate issues requiring attention'}
                                                                {severity === 'high' && 'Critical issues requiring immediate action'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Location Selection */}
                                <div className="form-group">
                                    <label className="form-label">
                                        <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Incident Location *
                                    </label>

                                    {/* Location Method Selection */}
                                    <div className="location-methods">
                                        <label className={`location-method ${locationMethod === 'map' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="locationMethod"
                                                value="map"
                                                checked={locationMethod === 'map'}
                                                onChange={(e) => setLocationMethod(e.target.value)}
                                            />
                                            Select on Map
                                        </label>
                                        <label className={`location-method ${locationMethod === 'manual' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="locationMethod"
                                                value="manual"
                                                checked={locationMethod === 'manual'}
                                                onChange={(e) => setLocationMethod(e.target.value)}
                                            />
                                            Enter Manually
                                        </label>
                                        <label className={`location-method ${locationMethod === 'current' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="locationMethod"
                                                value="current"
                                                checked={locationMethod === 'current'}
                                                onChange={(e) => setLocationMethod(e.target.value)}
                                            />
                                            Use Current Location
                                        </label>
                                    </div>

                                    {/* Map Selection */}
                                    {locationMethod === 'map' && (
                                        <div className="map-container">
                                            <div className="map-instructions">
                                                <p>Click on the map to select the incident location</p>
                                            </div>
                                            <div ref={mapRef} className="location-map" style={{ height: '300px', width: '100%' }}></div>
                                            {formData.location.latitude && formData.location.longitude && (
                                                <div className="selected-coordinates">
                                                    <div className="coordinates-info">
                                                        <strong>Selected Location:</strong>
                                                    </div>
                                                    <div className="coordinates-details">
                                                        <div className="coordinates-line">
                                                            📍 Coordinates: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                                                        </div>
                                                        {formData.address && (
                                                            <div className="address-line">
                                                                🏠 Address: {formData.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Manual Location Input */}
                                    {locationMethod === 'manual' && (
                                        <div>
                                            <div className="manual-location-methods">
                                                <label className={`manual-method ${manualLocationMethod === 'type' ? 'active' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        value="type"
                                                        checked={manualLocationMethod === 'type'}
                                                        onChange={(e) => setManualLocationMethod(e.target.value)}
                                                    />
                                                    Type Coordinates
                                                </label>
                                                <label className={`manual-method ${manualLocationMethod === 'current' ? 'active' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        value="current"
                                                        checked={manualLocationMethod === 'current'}
                                                        onChange={(e) => setManualLocationMethod(e.target.value)}
                                                    />
                                                    Use Current Location
                                                </label>
                                            </div>

                                            {manualLocationMethod === 'type' && (
                                                <div className="coordinates-inputs">
                                                    <div className="coordinate-group">
                                                        <label htmlFor="latitude" className="coordinate-label">Latitude *</label>
                                                        <input
                                                            type="number"
                                                            id="latitude"
                                                            name="latitude"
                                                            value={formData.location.latitude || ''}
                                                            onChange={handleLocationChange}
                                                            className="coordinate-input"
                                                            step="any"
                                                            placeholder="e.g., 28.6139"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="coordinate-group">
                                                        <label htmlFor="longitude" className="coordinate-label">Longitude *</label>
                                                        <input
                                                            type="number"
                                                            id="longitude"
                                                            name="longitude"
                                                            value={formData.location.longitude || ''}
                                                            onChange={handleLocationChange}
                                                            className="coordinate-input"
                                                            step="any"
                                                            placeholder="e.g., 77.2090"
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
                                                        Use My Current Location
                                                    </button>
                                                    {formData.location.latitude && formData.location.longitude && (
                                                        <div className="current-coordinates">
                                                            <div className="coordinates-info">
                                                                <strong>Current Location:</strong>
                                                            </div>
                                                            <div className="coordinates-details">
                                                                <div className="coordinates-line">
                                                                    📍 Coordinates: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                                                                </div>
                                                                {formData.address && (
                                                                    <div className="address-line">
                                                                        🏠 Address: {formData.address}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Current Location */}
                                    {locationMethod === 'current' && (
                                        <div className="current-location-section">
                                            <button
                                                type="button"
                                                onClick={handleUseCurrentLocation}
                                                className="current-location-btn"
                                            >
                                                Use My Current Location
                                            </button>
                                            {formData.location.latitude && formData.location.longitude && (
                                                <div className="current-coordinates">
                                                    <div className="coordinates-info">
                                                        <strong>Current Location:</strong>
                                                    </div>
                                                    <div className="coordinates-details">
                                                        <div className="coordinates-line">
                                                            📍 Coordinates: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                                                        </div>
                                                        {formData.address && (
                                                            <div className="address-line">
                                                                🏠 Address: {formData.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Address Field */}
                                <div className="form-group">
                                    <label htmlFor="address" className="form-label">
                                        <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Address (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Street address, landmark, or nearby location"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`animated-button ${isSubmitting ? 'submitting' : ''}`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="submit-spinner"></div>
                                                <span className="submit-btn-text">Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path className="arr-2" d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" fill="currentColor"/>
                                                    <path className="arr-1" d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" fill="currentColor"/>
                                                </svg>
                                                <span className="text">Submit Complaint</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* View Complaints Section moved to UserProfile -> MyComplaints component */}
                </div>
            </div>

            <Footer />
            {/* Nested route content (e.g., follow-up) will render here */}
            <Outlet />
        </>
    );
}
