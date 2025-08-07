import React, { useState, useEffect, useRef } from "react";
import "./UserProfile.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loadUser, logout, updateUser } from "./auth/redux/authSlice";
import { 
    User, 
    Settings, 
    Bell, 
    Shield, 
    Activity, 
    LogOut, 
    Edit3, 
    Camera,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ArrowLeft,
    Clock,
    Save,
    X,
    Search
} from "lucide-react";

function UserProfile() {
    const [activeSection, setActiveSection] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        latitude: null,
        longitude: null
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [geocodingLoading, setGeocodingLoading] = useState(false);
    const [updateError, setUpdateError] = useState('');
    const [updateSuccess, setUpdateSuccess] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
    const hasLoadedUser = useRef(false);
    
    // Load user data when component mounts
    useEffect(() => {
        console.log("UserProfile component mounted");
        const token = localStorage.getItem("token");
        console.log("Token exists:", !!token);
        console.log("Current user:", user);
        console.log("isAuthenticated:", isAuthenticated);
        console.log("Has loaded user:", hasLoadedUser.current);
        
        // If we have a token, always load user data to ensure fresh data
        if (token && !loading && !hasLoadedUser.current) {
            console.log("Loading/refreshing user data for profile page...");
            hasLoadedUser.current = true;
            dispatch(loadUser())
                .unwrap()
                .then((userData) => {
                    console.log("User data loaded for profile:", userData);
                })
                .catch((error) => {
                    console.error("Failed to load user for profile:", error);
                    hasLoadedUser.current = false; // Reset on error
                    // If loading fails, redirect to login
                    navigate('/login');
                });
        } else if (!token && !isAuthenticated) {
            console.log("No token found, redirecting to login");
            hasLoadedUser.current = false; // Reset
            navigate('/login');
        }
    }, [dispatch, user, isAuthenticated, loading, navigate]);

    // Cleanup function
    useEffect(() => {
        return () => {
            // Clear any pending address geocoding timeout
            if (window.addressTimeout) {
                clearTimeout(window.addressTimeout);
            }
        };
    }, []);
    
    const handleBackToHome = () => {
        navigate('/');
    };
    
    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    const handleEditProfile = () => {
        if (user) {
            setEditForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || user.location || '',
                latitude: user.latitude || null,
                longitude: user.longitude || null
            });
            setIsEditing(true);
            setUpdateError('');
            setUpdateSuccess('');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({
            name: '',
            email: '',
            phone: '',
            address: '',
            latitude: null,
            longitude: null
        });
        setUpdateError('');
        setUpdateSuccess('');
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
        
        // If address field is being changed, debounce geocoding
        if (name === 'address' && value.trim().length > 5) {
            // Clear any existing timeout
            if (window.addressTimeout) {
                clearTimeout(window.addressTimeout);
            }
            
            // Set a new timeout for geocoding
            window.addressTimeout = setTimeout(() => {
                geocodeAddress(value.trim());
            }, 1000); // Wait 1 second after user stops typing
        }
    };

    // Geocode address to get coordinates
    const geocodeAddress = async (address) => {
        if (!address || address.length < 5) return;
        
        setGeocodingLoading(true);
        
        try {
            // Using Nominatim (OpenStreetMap) - free geocoding service
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    const result = data[0];
                    const latitude = parseFloat(result.lat);
                    const longitude = parseFloat(result.lon);
                    
                    setEditForm(prev => ({
                        ...prev,
                        latitude: latitude,
                        longitude: longitude
                    }));
                    console.log(`Geocoded "${address}" to:`, latitude, longitude);
                }
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            // Don't show error to user for automatic geocoding
        } finally {
            setGeocodingLoading(false);
        }
    };

    // Reverse geocode coordinates to get address
    const reverseGeocode = async (latitude, longitude) => {
        try {
            // Using Nominatim (OpenStreetMap) - free reverse geocoding service
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.display_name) {
                    return data.display_name;
                }
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
        
        // Fallback to coordinates if reverse geocoding fails
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    };

    // Manual geocoding trigger
    const handleGeocodeAddress = async () => {
        if (!editForm.address || editForm.address.trim().length < 5) {
            setUpdateError('Please enter a valid address first');
            return;
        }
        
        await geocodeAddress(editForm.address.trim());
    };

    const getCurrentLocation = () => {
        setLocationLoading(true);
        setUpdateError('');

        if (!navigator.geolocation) {
            setUpdateError('Geolocation is not supported by this browser');
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    console.log(`Got coordinates: ${latitude}, ${longitude}`);
                    
                    // First update the coordinates
                    setEditForm(prev => ({
                        ...prev,
                        latitude: latitude,
                        longitude: longitude
                    }));
                    
                    // Then try to get a readable address
                    const address = await reverseGeocode(latitude, longitude);
                    console.log(`Reverse geocoded to: ${address}`);
                    
                    setEditForm(prev => ({
                        ...prev,
                        address: address,
                        latitude: latitude,
                        longitude: longitude
                    }));
                } catch (error) {
                    console.error('Location processing error:', error);
                    // Still save coordinates even if reverse geocoding fails
                    const coordinateAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    setEditForm(prev => ({
                        ...prev,
                        address: coordinateAddress,
                        latitude: latitude,
                        longitude: longitude
                    }));
                }
                
                setLocationLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Failed to get location';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please allow location access and try again.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                }
                
                setUpdateError(errorMessage);
                setLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    const handleSaveProfile = async () => {
        try {
            setUpdateError('');
            setUpdateSuccess('');
            
            // Validate required fields
            if (!editForm.name || !editForm.email || !editForm.phone || !editForm.address) {
                setUpdateError('All fields are required');
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(editForm.email)) {
                setUpdateError('Please enter a valid email address');
                return;
            }

            // Validate phone format (basic validation)
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(editForm.phone.replace(/[\s\-\(\)]/g, ''))) {
                setUpdateError('Please enter a valid phone number');
                return;
            }

            await dispatch(updateUser(editForm)).unwrap();
            setUpdateSuccess('Profile updated successfully!');
            setIsEditing(false);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setUpdateSuccess('');
            }, 3000);
        } catch (error) {
            console.error('Update profile error:', error);
            setUpdateError(error || 'Failed to update profile. Please try again.');
        }
    };
    
    // Use real user data from Redux or fallback to defaults
    const userData = user ? {
        name: user.name || "Unknown User",
        email: user.email || "No email provided",
        phone: user.phone || "No phone provided",
        role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User",
        location: user.address || user.location || "Address not specified",
        joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
        }) : "Unknown",
        profileImage: user.profileImage || "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png",
        department: user.department || "Emergency Response Team",
        badgeNumber: user.badgeNumber || `${user.role?.toUpperCase() || 'USER'}-${new Date(user.createdAt || Date.now()).getFullYear()}-${user._id?.slice(-3) || '001'}`,
        clearanceLevel: user.clearanceLevel || `Level ${user.role === 'admin' ? '5 - Maximum' : user.role === 'authority' ? '4 - High Priority' : '3 - Standard Access'}`,
        coordinates: user.latitude && user.longitude ? `${user.latitude}, ${user.longitude}` : null
    } : {
        name: "Loading...",
        email: "Loading...",
        phone: "Loading...",
        role: "Loading...",
        location: "Loading...",
        joinDate: "Loading...",
        profileImage: "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png",
        department: "Loading...",
        badgeNumber: "Loading...",
        clearanceLevel: "Loading...",
        coordinates: null
    };

    // Show loading state
    if (loading) {
        return (
            <div className="user-profile-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your profile...</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated and no loading
    if (!isAuthenticated && !loading && !localStorage.getItem("token")) {
        navigate('/login');
        return null;
    }

    const sidebarLinks = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'History', label: 'History', icon: Clock },
        { id: 'activity', label: 'Activity Log', icon: Activity },
    ];

    const renderProfileContent = () => (
        <div className="space-y-8">
            {/* Profile Header */}
            <div className="profile-card" style={{'--delay': '0.1s'}}>
                <div className="profile-header">
                    {/* Profile Picture */}
                    <div className="profile-avatar-container">
                        <img
                            src={userData.profileImage}
                            alt={userData.name}
                            className="user-profile-main-avatar"
                        />
                        <button className="avatar-edit-btn">
                            <Camera className="camera-icon" />
                        </button>
                    </div>

                    {/* Profile Info */}
                    <div className="profile-info">
                        <div className="profile-header-row">
                            <h1 className="profile-name">
                                {userData.name}
                            </h1>
                            <button 
                                className="edit-profile-btn" 
                                onClick={handleEditProfile}
                                disabled={loading}
                            >
                                <Edit3 className="edit-icon" />
                                Edit Profile
                            </button>
                        </div>
                        
                        <div className="profile-details">
                            <p className="profile-role">
                                {userData.role}
                            </p>
                            <p className="profile-department">
                                {userData.department}
                            </p>
                            <p className="profile-badge">
                                Badge: {userData.badgeNumber}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information */}
            <div className="profile-card" style={{'--delay': '0.3s'}}>
                <div className="section-header">
                    <Mail className="section-icon" style={{color: '#93c5fd'}} />
                    <h2 className="section-title">Contact Information</h2>
                    {isEditing && (
                        <div className="edit-actions">
                            <button 
                                className="save-btn" 
                                onClick={handleSaveProfile}
                                disabled={loading}
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                            <button 
                                className="cancel-btn" 
                                onClick={handleCancelEdit}
                                disabled={loading}
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Error/Success Messages */}
                {updateError && (
                    <div className="update-message error">
                        {updateError}
                    </div>
                )}
                {updateSuccess && (
                    <div className="update-message success">
                        {updateSuccess}
                    </div>
                )}
                
                <div className="contact-grid">
                    <div className="contact-column">
                        <div className="contact-item">
                            <User className="contact-icon" style={{color: '#fbbf24'}} />
                            <div className="contact-info">
                                <p className="contact-label">Full Name</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleFormChange}
                                        className="contact-input"
                                        placeholder="Enter your full name"
                                        disabled={loading}
                                    />
                                ) : (
                                    <p className="contact-value">{userData.name}</p>
                                )}
                            </div>
                        </div>

                        <div className="contact-item">
                            <Mail className="contact-icon" style={{color: '#93c5fd'}} />
                            <div className="contact-info">
                                <p className="contact-label">Email</p>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={editForm.email}
                                        onChange={handleFormChange}
                                        className="contact-input"
                                        placeholder="Enter your email"
                                        disabled={loading}
                                    />
                                ) : (
                                    <p className="contact-value">{userData.email}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="contact-item">
                            <Phone className="contact-icon" style={{color: '#86efac'}} />
                            <div className="contact-info">
                                <p className="contact-label">Phone</p>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={handleFormChange}
                                        className="contact-input"
                                        placeholder="Enter your phone number"
                                        disabled={loading}
                                    />
                                ) : (
                                    <p className="contact-value">{userData.phone}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="contact-column">
                        <div className="contact-item">
                            <MapPin className="contact-icon" style={{color: '#fca5a5'}} />
                            <div className="contact-info">
                                <p className="contact-label">Address</p>
                                {isEditing ? (
                                    <div>
                                        <div className="address-input-container">
                                            <input
                                                type="text"
                                                name="address"
                                                value={editForm.address}
                                                onChange={handleFormChange}
                                                className="contact-input"
                                                placeholder="Enter your address (we'll find coordinates) or use location button"
                                                disabled={loading}
                                            />
                                            <div className="address-buttons">
                                                <button
                                                    type="button"
                                                    onClick={handleGeocodeAddress}
                                                    className="geocode-btn"
                                                    disabled={loading || geocodingLoading || !editForm.address || editForm.address.trim().length < 5}
                                                    title="Find coordinates for this address"
                                                >
                                                    {geocodingLoading ? (
                                                        <div className="location-spinner"></div>
                                                    ) : (
                                                        <Search className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={getCurrentLocation}
                                                    className="location-btn"
                                                    disabled={loading || locationLoading || geocodingLoading}
                                                    title="Get current location"
                                                >
                                                    {locationLoading ? (
                                                        <div className="location-spinner"></div>
                                                    ) : (
                                                        <MapPin className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Status indicators */}
                                        {geocodingLoading && (
                                            <p className="geocoding-status">
                                                🔍 Finding coordinates for address...
                                            </p>
                                        )}
                                        
                                        {editForm.latitude && editForm.longitude && (
                                            <div className="coordinates-info">
                                                <p className="coordinates-display">
                                                    📍 {editForm.latitude.toFixed(6)}, {editForm.longitude.toFixed(6)}
                                                </p>
                                                <p className="coordinates-note">
                                                    ✓ Both address and coordinates are captured
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <p className="contact-value">{userData.location}</p>
                                        {userData.coordinates && (
                                            <p className="coordinates-display">📍 {userData.coordinates}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="contact-item">
                            <Calendar className="contact-icon" style={{color: '#c4b5fd'}} />
                            <div className="contact-info">
                                <p className="contact-label">Joined</p>
                                <p className="contact-value">{userData.joinDate}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Clearance */}
            <div className="profile-card" style={{'--delay': '0.5s'}}>
                <div className="section-header">
                    <Shield className="section-icon" style={{color: '#86efac'}} />
                    <h2 className="section-title">Security Clearance</h2>
                </div>
                
                <div className="security-clearance">
                    <div className="clearance-content">
                        <div className="clearance-icon-container">
                            <Shield className="clearance-icon" />
                        </div>
                        <div className="clearance-info">
                            <p className="clearance-level">{userData.clearanceLevel}</p>
                            <p className="clearance-description">Access to critical emergency systems</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch(activeSection) {
            case 'profile':
                return renderProfileContent();
            case 'settings':
                return (
                    <div className="profile-card" style={{'--delay': '0.1s'}}>
                        <h2 className="section-title">Settings</h2>
                        <p style={{color: 'rgba(255, 255, 255, 0.8)'}}>Settings content coming soon...</p>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="profile-card" style={{'--delay': '0.1s'}}>
                        <h2 className="section-title">Notifications</h2>
                        <p style={{color: 'rgba(255, 255, 255, 0.8)'}}>Notification preferences coming soon...</p>
                    </div>
                );
            case 'security':
                return (
                    <div className="profile-card" style={{'--delay': '0.1s'}}>
                        <h2 className="section-title">Security</h2>
                        <p style={{color: 'rgba(255, 255, 255, 0.8)'}}>Security settings coming soon...</p>
                    </div>
                );
            case 'activity':
                return (
                    <div className="profile-card" style={{'--delay': '0.1s'}}>
                        <h2 className="section-title">Activity Log</h2>
                        <p style={{color: 'rgba(255, 255, 255, 0.8)'}}>Activity history coming soon...</p>
                    </div>
                );
            default:
                return renderProfileContent();
        }
    };

    return (
        <div className="user-profile-container">
            {/* Background Elements */}
            <div className="profile-background">
                <div className="profile-bg-element"></div>
                <div className="profile-bg-element"></div>
                <div className="profile-bg-element"></div>
            </div>

            {/* Left Sidebar */}
            <div className="profile-sidebar">
                <div className="sidebar-content">
                    {/* Logo */}
                    <div className="profile-logo">
                        <div className="logo-icon">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <span className="logo-text">Rescue</span>
                    </div>

                    {/* User Quick Info */}
                    <div className="user-quick-info">
                        <div className="user-info-content">
                            <img
                                src={userData.profileImage}
                                alt={userData.name}
                                className="user-quick-avatar"
                            />
                            <div>
                                <p className="user-quick-name">{userData.name}</p>
                                <p className="user-quick-role">{userData.role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="profile-nav">
                        {sidebarLinks.map((link, index) => {
                            const Icon = link.icon;
                            return (
                                <button
                                    key={link.id}
                                    onClick={() => setActiveSection(link.id)}
                                    className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
                                    style={{'--delay': `${index * 0.1}s`}}
                                >
                                    <Icon className="nav-icon" />
                                    <span>{link.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Logout Button */}
                    <div className="logout-container">
                        <button className="logout-btn" onClick={handleLogout}>
                            <LogOut className="w-5 h-5" />
                            <span>Sign out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="profile-main">
                {/* Back Button */}
                <div className="back-button-container">
                    <button
                        onClick={handleBackToHome}
                        className="back-btn"
                        title="Back to Home"
                    >
                        <ArrowLeft className="back-icon" />
                    </button>
                </div>
                
                <div className="content-container">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default UserProfile
