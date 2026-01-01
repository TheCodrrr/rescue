import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateUser, uploadProfileImage, changePassword, deleteUser } from './auth/redux/authSlice';
import MyComplaints from './MyComplaints';
import UserHistory from './UserHistory';
import Analytics from './Analytics';
import Notifications from './Notifications';
import { 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Calendar, 
    Shield, 
    Key,
    Edit3, 
    Save, 
    X, 
    Camera, 
    Search,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import CloudImage from './utils/CloudImage';

// Password Change Modal Component - moved outside to prevent re-renders
const PasswordChangeModal = React.memo(({ 
    passwordForm, 
    handlePasswordFormChange, 
    passwordError, 
    passwordSuccess, 
    passwordUpdating,
    handleCancelPasswordChange,
    handlePasswordSubmit 
}) => (
    <div className="modal-overlay" onClick={handleCancelPasswordChange}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <div className="modal-icon-container password">
                    <Key className="modal-icon" />
                </div>
                <h2 className="modal-title">Change Password</h2>
                <p className="modal-subtitle">Update your account password</p>
            </div>
            
            <div className="modal-content">
                <div className="password-form">
                    <div className="form-group">
                        <label htmlFor="oldPassword" className="form-label">
                            Current Password
                        </label>
                        <input
                            id="oldPassword"
                            type="password"
                            name="oldPassword"
                            value={passwordForm.oldPassword}
                            onChange={handlePasswordFormChange}
                            className="form-input"
                            placeholder="Enter your current password"
                            disabled={passwordUpdating}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="newPassword" className="form-label">
                            New Password
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            name="newPassword"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordFormChange}
                            className="form-input"
                            placeholder="Enter new password (min 6 characters)"
                            disabled={passwordUpdating}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordFormChange}
                            className="form-input"
                            placeholder="Confirm your new password"
                            disabled={passwordUpdating}
                        />
                    </div>
                </div>
                
                {passwordError && (
                    <div className="modal-error">
                        <AlertTriangle className="error-icon" />
                        <span>{passwordError}</span>
                    </div>
                )}
                
                {passwordSuccess && (
                    <div className="modal-success">
                        <div className="success-icon">✓</div>
                        <span>{passwordSuccess}</span>
                    </div>
                )}
            </div>
            
            <div className="modal-actions">
                <button
                    onClick={handleCancelPasswordChange}
                    className="modal-btn cancel"
                    disabled={passwordUpdating}
                >
                    <X className="btn-icon" />
                    Cancel
                </button>
                <button
                    onClick={handlePasswordSubmit}
                    className="modal-btn primary"
                    disabled={passwordUpdating || !passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                >
                    {passwordUpdating ? (
                        <>
                            <div className="btn-spinner"></div>
                            Updating...
                        </>
                    ) : (
                        <>
                            <Key className="btn-icon" />
                            Change Password
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
));

function UserProfileContent({ activeSection, contentRef }) {
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
    const [imageUploading, setImageUploading] = useState(false);
    const [profileUpdating, setProfileUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');
    const [updateSuccess, setUpdateSuccess] = useState('');
    const [imageRefreshKey, setImageRefreshKey] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordUpdating, setPasswordUpdating] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    
    // Reset scroll position when activeSection changes
    useEffect(() => {
        if (contentRef && contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeSection, contentRef]);
    
    const handleEditProfile = () => {
        setEditForm({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            address: user?.address || user?.location || '',
            latitude: user?.latitude || null,
            longitude: user?.longitude || null
        });
        setIsEditing(true);
        setUpdateError('');
        setUpdateSuccess('');
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
    };

    // Geocode address to get coordinates using Nominatim (OpenStreetMap)
    const geocodeAddress = async (address) => {
        if (!address || address.trim().length < 5) {
            throw new Error('Address too short for geocoding');
        }
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'RescueApp/1.0' // Required by Nominatim
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                return {
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon),
                    formattedAddress: result.display_name
                };
            } else {
                throw new Error('Address not found');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    };

    // Reverse geocode coordinates to get address using Nominatim
    const reverseGeocode = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                {
                    headers: {
                        'User-Agent': 'RescueApp/1.0' // Required by Nominatim
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Reverse geocoding service unavailable');
            }
            
            const data = await response.json();
            
            if (data && data.display_name) {
                return data.display_name;
            } else {
                throw new Error('Could not determine address from coordinates');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            throw error;
        }
    };

    // Manual geocoding trigger
    const handleGeocodeAddress = async () => {
        if (!editForm.address || editForm.address.trim().length < 5) {
            setUpdateError('Please enter a valid address (at least 5 characters)');
            return;
        }

        setGeocodingLoading(true);
        setUpdateError('');

        try {
            const result = await geocodeAddress(editForm.address);
            setEditForm(prev => ({
                ...prev,
                latitude: result.latitude,
                longitude: result.longitude,
                address: result.formattedAddress
            }));
            setUpdateSuccess('✓ Address geocoded successfully!');
        } catch (error) {
            console.error('Geocoding error:', error);
            setUpdateError(`Geocoding failed: ${error.message}`);
        } finally {
            setGeocodingLoading(false);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setUpdateError('Geolocation is not supported by this browser.');
            return;
        }

        setLocationLoading(true);
        setUpdateError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    setGeocodingLoading(true);
                    const address = await reverseGeocode(latitude, longitude);
                    
                    setEditForm(prev => ({
                        ...prev,
                        latitude,
                        longitude,
                        address
                    }));
                    setUpdateSuccess('✓ Location and address captured successfully!');
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                    setEditForm(prev => ({
                        ...prev,
                        latitude,
                        longitude
                    }));
                    setUpdateSuccess('✓ Location captured (address lookup failed)');
                } finally {
                    setLocationLoading(false);
                    setGeocodingLoading(false);
                }
            },
            (error) => {
                setLocationLoading(false);
                console.error('Geolocation error:', error);
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setUpdateError("Location access denied. Please enable location permissions.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setUpdateError("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        setUpdateError("Location request timed out.");
                        break;
                    default:
                        setUpdateError("An unknown error occurred while retrieving location.");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    const handleSaveProfile = async () => {
        setProfileUpdating(true);
        setUpdateError('');
        setUpdateSuccess('');

        try {
            const updateData = {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                address: editForm.address,
                latitude: editForm.latitude,
                longitude: editForm.longitude
            };

            const result = await dispatch(updateUser(updateData)).unwrap();
            
            if (result) {
                setUpdateSuccess('✅ Profile updated successfully!');
                setIsEditing(false);
                
                setTimeout(() => {
                    setUpdateSuccess('');
                }, 3000);
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setUpdateError(error || 'Failed to update profile. Please try again.');
        } finally {
            setProfileUpdating(false);
        }
    };

    // Handle profile image upload
    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setUpdateError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setUpdateError('Image file size must be less than 5MB');
            return;
        }

        setImageUploading(true);
        setUpdateError('');

        try {
            const result = await dispatch(uploadProfileImage(file)).unwrap();
            
            if (result) {
                setImageRefreshKey(prev => prev + 1);
                setUpdateSuccess('✅ Profile image updated successfully!');
                
                setTimeout(() => {
                    setUpdateSuccess('');
                }, 3000);
            }
        } catch (error) {
            console.error('Image upload error:', error);
            setUpdateError(error || 'Failed to upload image. Please try again.');
        } finally {
            setImageUploading(false);
            event.target.value = '';
        }
    };

    // Trigger file input click
    const handleAvatarClick = () => {
        if (!imageUploading) {
            document.getElementById('profile-image-input').click();
        }
    };

    // Handle delete user account
    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);

        try {
            await dispatch(deleteUser()).unwrap();

            setShowDeleteModal(false);
            setShowSuccessModal(true);

            setTimeout(() => {
                dispatch({ type: 'auth/logout' });
                navigate('/');
            }, 3000);

        } catch (error) {
            console.error('Account deletion error:', error);
            setUpdateError(error.message || 'Failed to delete account. Please try again.');
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
    };

    // Handle change password
    const handleChangePassword = () => {
        setShowPasswordModal(true);
        setPasswordForm({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setPasswordError('');
        setPasswordSuccess('');
    };

    const handlePasswordFormChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError('');
    };

    const handlePasswordSubmit = async () => {
        // Validation
        if (passwordForm.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        setPasswordUpdating(true);
        setPasswordError('');

        try {
            await dispatch(changePassword({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword
            })).unwrap();

            setPasswordSuccess('✅ Password changed successfully!');
            
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordForm({
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setPasswordSuccess('');
            }, 2000);

        } catch (error) {
            console.error('Password change error:', error);
            setPasswordError(error.message || 'Failed to change password. Please try again.');
        } finally {
            setPasswordUpdating(false);
        }
    };

    const handleCancelPasswordChange = () => {
        setShowPasswordModal(false);
        setPasswordForm({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setPasswordError('');
        setPasswordSuccess('');
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
        profileImage: user.profileImage ? 
            `${user.profileImage}${user.profileImage.includes('?') ? '&' : '?'}v=${imageRefreshKey}&t=${Date.now()}` : 
            "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png",
        department: user.department || "Emergency Response Team",
        badgeNumber: user.badgeNumber || `${user.role?.toUpperCase() || 'USER'}-${new Date(user.createdAt || Date.now()).getFullYear()}-${user._id?.slice(-3) || '001'}`,
        clearanceLevel: user.user_level !== undefined 
            ? (user.user_level === 0 ? 'Basic Level' : `Level ${user.user_level}`)
            : (user.role === 'admin' ? 'Level 5' : user.role === 'officer' ? 'Level 3' : 'Basic Level'),
        clearanceLevelDescription: user.user_level !== undefined
            ? (user.user_level === 0 ? 'Citizen Access' : user.user_level === 5 && user.role === 'admin' ? 'Administrator - Full System Access' : `Officer Level ${user.user_level}`)
            : (user.role === 'admin' ? 'Administrator - Full System Access' : user.role === 'officer' ? 'Officer Level 3' : 'Citizen Access'),
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
        clearanceLevelDescription: "Loading...",
        coordinates: null
    };

    const renderProfileContent = () => (
        <div className="space-y-8">
            {/* Profile Header Card */}
            <div className="profile-header">
                    <div className="profile-avatar-container">
                        {/* <img
                            key={`main-avatar-${imageRefreshKey}`}
                            src={userData.profileImage}
                            alt={userData.name}
                            className="user-profile-main-avatar"
                            onLoad={() => console.log("Profile image loaded:", userData.profileImage)}
                            onError={(e) => {
                                console.log("Profile image failed to load:", userData.profileImage);
                                e.target.src = "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png";
                            }}
                        /> */}
                        <CloudImage
                            key={`main-avatar-${imageRefreshKey}`}
                            src={userData.profileImage}
                            alt={userData.name}
                            className="user-profile-main-avatar"
                            onLoad={() => console.log("Profile image loaded:", userData.profileImage)}
                            onError={(e) => {
                                console.log("Profile image failed to load:", userData.profileImage);
                                e.target.src = userData.profileImage.includes("cloudinary")
                                ? userData.profileImage.replace("/upload/", "/upload/w_20,q_10,e_blur:1000/")
                                : "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png";
                            }}
                        />
                        <button 
                            className="avatar-edit-btn"
                            onClick={handleAvatarClick}
                            disabled={imageUploading}
                            title="Change profile picture"
                        >
                            {imageUploading ? (
                                <div className="location-spinner"></div>
                            ) : (
                                <Camera className="camera-icon" />
                            )}
                        </button>
                        <input
                            id="profile-image-input"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="profile-info">
                        <div className="profile-header-row">
                            <h1 className="profile-name">
                                {userData.name}
                            </h1>
                            <button 
                                className="edit-profile-btn" 
                                onClick={handleEditProfile}
                                disabled={isEditing}
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

            {/* Contact Information Card */}
            <div className="profile-card" style={{'--delay': '0.3s'}}>
                <div className="up-profile-section-header">
                    <Mail className="section-icon" style={{color: '#93c5fd'}} />
                    <h2 className="up-profile-section-title">Contact Information</h2>
                    {isEditing && (
                        <div className="edit-actions">
                            <button 
                                className="save-btn" 
                                onClick={handleSaveProfile}
                                disabled={profileUpdating}
                            >
                                <Save className="w-4 h-4" />
                                {profileUpdating ? 'Saving...' : 'Save'}
                            </button>
                            <button 
                                className="cancel-btn" 
                                onClick={handleCancelEdit}
                                disabled={profileUpdating}
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                
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
                {imageUploading && (
                    <div className="update-message info">
                        📸 Uploading profile image...
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
                                        disabled={false}
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
                                        disabled={false}
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
                                        disabled={false}
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
                                                disabled={false}
                                            />
                                            <div className="address-buttons">
                                                <button
                                                    type="button"
                                                    onClick={handleGeocodeAddress}
                                                    className="geocode-btn"
                                                    disabled={geocodingLoading || !editForm.address || editForm.address.trim().length < 5}
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
                                                    disabled={locationLoading || geocodingLoading}
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

            {/* Security & Access Card */}
            <div className="profile-card" style={{'--delay': '0.5s'}}>
                <div className="up-profile-section-header">
                    <Shield className="section-icon" style={{color: '#86efac'}} />
                    <h2 className="up-profile-section-title">Security & Access</h2>
                </div>
                
                <div className="security-clearance">
                    <div className="clearance-content">
                        <div className="clearance-icon-container">
                            <Shield className="clearance-icon" />
                        </div>
                        <div className="clearance-info">
                            <p className="clearance-level">{userData.clearanceLevel}</p>
                            <p className="clearance-description">{userData.clearanceLevelDescription}</p>
                        </div>
                    </div>
                    
                    <div className="password-section">
                        <div className="password-info">
                            <Key className="password-icon" style={{color: '#fbbf24'}} />
                            <div>
                                <h4 className="password-title">Password Security</h4>
                                <p className="password-description">Keep your account secure by updating your password regularly</p>
                            </div>
                        </div>
                        <button 
                            className="change-password-btn" 
                            onClick={handleChangePassword}
                            disabled={passwordUpdating}
                        >
                            <Key className="key-icon" />
                            Change Password
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone Card */}
            <div className="profile-card danger-zone" style={{'--delay': '0.7s'}}>
                <div className="up-profile-section-header">
                    <AlertTriangle className="section-icon danger-icon" />
                    <h2 className="up-profile-section-title">Danger Zone</h2>
                </div>
                
                <div className="danger-content">
                    <div className="danger-warning">
                        <Trash2 className="danger-warning-icon" />
                        <div className="danger-text">
                            <h3 className="danger-title">Delete Account</h3>
                            <p className="danger-description">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        className="delete-account-btn" 
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                    >
                        <Trash2 className="delete-icon" />
                        Delete My Account
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSettingsContent = () => (
        <div className="space-y-8">
            <div className="profile-card">
                <h2 className="up-profile-section-title">Settings</h2>
                <p style={{color: 'rgba(255, 255, 255, 0.7)', margin: '1rem 0'}}>
                    Settings panel coming soon...
                </p>
            </div>
        </div>
    );

    const renderNotificationsContent = () => (
        <Notifications />
    );

    const renderHistoryContent = () => (
        <UserHistory />
    );

    const renderActivityContent = () => (
        <div className="space-y-8">
            <div className="profile-card">
                <h2 className="up-profile-section-title">Activity Log</h2>
                <p style={{color: 'rgba(255, 255, 255, 0.7)', margin: '1rem 0'}}>
                    Activity log coming soon...
                </p>
            </div>
        </div>
    );

    const renderAnalyticsContent = () => (
        <Analytics />
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return renderProfileContent();
            case 'my-complaint':
                return <MyComplaints />;
            case 'analytics':
                return renderAnalyticsContent();
            case 'settings':
                return renderSettingsContent();
            case 'notifications':
                return renderNotificationsContent();
            case 'History':
                return renderHistoryContent();
            case 'activity':
                return renderActivityContent();
            default:
                return renderProfileContent();
        }
    };

    return (
        <>
            <div className="content-container" ref={contentRef}>
                {renderContent()}
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <PasswordChangeModal
                    passwordForm={passwordForm}
                    handlePasswordFormChange={handlePasswordFormChange}
                    passwordError={passwordError}
                    passwordSuccess={passwordSuccess}
                    passwordUpdating={passwordUpdating}
                    handleCancelPasswordChange={handleCancelPasswordChange}
                    handlePasswordSubmit={handlePasswordSubmit}
                />
            )}

            {/* Delete Account Modal and Success Modal would go here */}
            {/* Add your existing modal components here */}
        </>
    );
}

export default UserProfileContent;
