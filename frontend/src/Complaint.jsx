import React, { useState, useEffect, useRef } from "react";
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import "./Complaint.css";
import "./Toast.css";
import "leaflet/dist/leaflet.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CommentModal from "./CommentModal.jsx";
import { 
  FiThumbsUp, 
  FiThumbsDown, 
  FiMessageCircle, 
  FiMapPin, 
  FiGlobe, 
  FiPhone,
  FiTool,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiLoader
} from 'react-icons/fi';
import { 
  MdLocalFireDepartment,
  MdBalance,
  MdLocalHospital,
  MdWater,
  MdConstruction,
  MdWarning,
  MdElectricalServices,
  MdTrain,
  MdDirectionsRailway
} from 'react-icons/md';
import { 
    submitComplaint, 
    clearSuccess, 
    clearError, 
    getUserComplaints,
    upvoteComplaint,
    downvoteComplaint,
    updateComplaintStatus,
    deleteComplaint,
    addComment,
    fetchComments,
    updateComment,
    removeComment
} from './auth/redux/complaintSlice';

export default function Complaint() {
    const dispatch = useDispatch();
    const { isSubmitting, success, error, complaints, isLoading } = useSelector((state) => state.complaints);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    
    // Get initial tab from URL params or default to 'register'
    const getInitialTab = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromUrl = urlParams.get('tab');
        return (tabFromUrl === 'view' || tabFromUrl === 'register') ? tabFromUrl : 'register';
    };
    
    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [expandedComments, setExpandedComments] = useState({}); // Track expanded comments
    const [votingInProgress, setVotingInProgress] = useState({}); // Track voting progress
    const [statusUpdateInProgress, setStatusUpdateInProgress] = useState({}); // Track status updates
    const [statusModalOpen, setStatusModalOpen] = useState(false); // Track status modal
    const [selectedComplaintForStatus, setSelectedComplaintForStatus] = useState(null); // Selected complaint for status update
    const [scrollPosition, setScrollPosition] = useState(0); // Track scroll position for modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false); // Track delete confirmation modal
    const [selectedComplaintForDelete, setSelectedComplaintForDelete] = useState(null); // Selected complaint for deletion
    const [deleteInProgress, setDeleteInProgress] = useState({}); // Track delete operations
    const [searchQuery, setSearchQuery] = useState(''); // Search query for complaints
    const [selectedCategory, setSelectedCategory] = useState('all'); // Selected category filter
    const [commentModalOpen, setCommentModalOpen] = useState(false); // Track comment modal
    const [selectedComplaintForComments, setSelectedComplaintForComments] = useState(null); // Selected complaint for comments
    const [newComment, setNewComment] = useState(''); // New comment input
    const [commentInProgress, setCommentInProgress] = useState(false); // Track comment submission
    const [commentRating, setCommentRating] = useState(5); // Rating for comment (1-5 stars)
    const [editingComment, setEditingComment] = useState(null); // Track which comment is being edited
    const [editedCommentText, setEditedCommentText] = useState(''); // Edited comment text
    const [editedCommentRating, setEditedCommentRating] = useState(5); // Edited comment rating
    const [editInProgress, setEditInProgress] = useState(false); // Track edit submission
    const [deletingComment, setDeletingComment] = useState(null); // Track which comment is being deleted
    const [updatingComment, setUpdatingComment] = useState(null); // Track which comment is being updated
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

    const categories = [
        { value: 'rail', label: 'Rail Incidents', icon: <MdTrain />, color: '#f59e0b' },
        { value: 'road', label: 'Road Issues', icon: <MdConstruction />, color: '#db2777' }, // New road category
        { value: 'fire', label: 'Fire Emergency', icon: <MdLocalFireDepartment />, color: '#ef4444' },
        { value: 'cyber', label: 'Cyber Crime', icon: <FiAlertTriangle />, color: '#8b5cf6' },
        { value: 'police', label: 'Police', icon: <FiAlertTriangle />, color: '#3b82f6' },
        { value: 'court', label: 'Court', icon: <MdBalance />, color: '#10b981' }
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
        if (locationMethod !== 'map' || activeTab !== 'register') return;

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
                    
                    // console.log('Map clicked at coordinates:', { lat, lng, latType: typeof lat, lngType: typeof lng });
                    
                    // Remove existing marker
                    if (markerRef.current) {
                        map.removeLayer(markerRef.current);
                    }
                    
                    // Add new marker
                    markerRef.current = L.marker([lat, lng]).addTo(map);
                    
                    // Update form data
                    setFormData(prev => {
                        const newFormData = {
                            ...prev,
                            location: {
                                latitude: lat,
                                longitude: lng
                            }
                        };
                        // console.log('Updated formData location:', newFormData.location);
                        return newFormData;
                    });
                    
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
    }, [locationMethod, userCurrentLocation, activeTab]);

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
                severity: 'medium', // Reset to default medium severity
                location: {
                    latitude: null,
                    longitude: null
                },
                address: '',
                trainNumber: ''
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

    // Load user complaints when switching to view tab
    useEffect(() => {
        if (activeTab === 'view' && isAuthenticated) {
            dispatch(getUserComplaints());
        }
    }, [activeTab, isAuthenticated, dispatch]);

    // Fetch comment counts for all complaints after they are loaded
    useEffect(() => {
        if (complaints && complaints.length > 0 && activeTab === 'view') {
            // Fetch comments for each complaint to get accurate counts
            // Only fetch if comments haven't been loaded yet
            complaints.forEach(complaint => {
                if (complaint._id && (!complaint.comments || complaint.comments.length === undefined)) {
                    console.log(`Fetching comments for complaint ${complaint._id} to get accurate count`);
                    dispatch(fetchComments(complaint._id));
                }
            });
        }
    }, [complaints, activeTab, dispatch]);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tabFromUrl = urlParams.get('tab');
            if ((tabFromUrl === 'view' || tabFromUrl === 'register') && tabFromUrl !== activeTab) {
                setActiveTab(tabFromUrl);
            }
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeTab]);

    // Handle scroll lock/unlock for status modal
    useEffect(() => {
        return () => {
            // Cleanup: always restore scroll when component unmounts
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.paddingRight = '';
            document.documentElement.style.overflow = '';
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
        };
    }, []);

    // Handle ESC key to close modals
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                if (statusModalOpen) {
                    closeStatusModal();
                } else if (deleteModalOpen) {
                    closeDeleteModal();
                } else if (commentModalOpen) {
                    closeCommentModal();
                }
            }
        };

        if (statusModalOpen || deleteModalOpen || commentModalOpen) {
            document.addEventListener('keydown', handleEscKey);
            return () => {
                document.removeEventListener('keydown', handleEscKey);
            };
        }
    }, [statusModalOpen, deleteModalOpen, commentModalOpen]);

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
            
            toast.success('Location detected successfully!', {
                duration: 3000,
                position: 'top-center',
                icon: <FiMapPin />,
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
            toast.error(`Error getting location: ${error.message}`, {
                duration: 4000,
                position: 'top-center',
                icon: <FiGlobe />,
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
        
        // console.log('=== FORM SUBMISSION DEBUG ===');
        // console.log('Complete formData:', JSON.stringify(formData, null, 2));
        // console.log('formData.location:', formData.location);
        // console.log('Raw coordinates:', {
        //     lat: formData.location.latitude,
        //     lng: formData.location.longitude,
        //     latType: typeof formData.location.latitude,
        //     lngType: typeof formData.location.longitude
        // });
        
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
        
        // Validate form (base fields)
        if (!formData.title || !formData.description || !formData.category || !formData.severity) {
            toast.error('📝 Please fill in all required fields including severity level', {
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

        // Validate location coordinates
        const lat = formData.location.latitude;
        const lng = formData.location.longitude;
        
        // console.log('Form location validation:', { lat, lng, latType: typeof lat, lngType: typeof lng });
        
        if (lat === null || lng === null || lat === undefined || lng === undefined || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            toast.error('� Please select a valid location on the map', {
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
                icon: '📍',
            });
            return;
        }

        // Rail category specific validation
        if (formData.category === 'rail') {
            const tn = formData.trainNumber?.trim();
            if (!tn) {
                toast.error('🚂 Please enter the 5-digit train number', {
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
            if (!/^\d{5}$/.test(tn)) {
                toast.error('🔢 Train number must be exactly 5 digits', {
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
            severity: formData.severity,
            location: {
                type: 'Point',
                coordinates: [
                    Number(parseFloat(formData.location.longitude)),
                    Number(parseFloat(formData.location.latitude))
                ],
                address: formData.address || null
            },
            // Always send category_data_id; rail uses trainNumber, others placeholder 'N/A'
            category_data_id: formData.category === 'rail' ? formData.trainNumber.trim() : 'N/A'
        };

        console.log('Dispatching submitComplaint with data:', complaintData);
        // console.log('Original location data:', formData.location);
        // console.log('Raw coordinates before conversion:', {
        //     lng: formData.location.longitude,
        //     lat: formData.location.latitude,
        //     lngType: typeof formData.location.longitude,
        //     latType: typeof formData.location.latitude
        // });
        // console.log('Converted coordinates:', complaintData.location.coordinates);
        // console.log('Converted coordinates types:', {
        //     lng: complaintData.location.coordinates[0],
        //     lat: complaintData.location.coordinates[1],
        //     lngType: typeof complaintData.location.coordinates[0],
        //     latType: typeof complaintData.location.coordinates[1]
        // });
        dispatch(submitComplaint(complaintData));
        
        // Dismiss the loading toast after a short delay
        setTimeout(() => {
            toast.dismiss('submitting');
        }, 1000);
    };

    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            'pending': 'status-pending',
            'in-progress': 'status-in-progress',
            'in_progress': 'status-in-progress', // Handle backend format
            'resolved': 'status-resolved',
            'rejected': 'status-rejected'
        };
        return statusClasses[status] || 'status-pending';
    };

    // Map frontend status values to backend format
    const mapStatusToBackend = (frontendStatus) => {
        const statusMapping = {
            'pending': 'pending',
            'in-progress': 'in_progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMapping[frontendStatus] || frontendStatus;
    };

    // Map backend status values to frontend format
    const mapStatusToFrontend = (backendStatus) => {
        const statusMapping = {
            'pending': 'pending',
            'in_progress': 'in-progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMapping[backendStatus] || backendStatus;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryIcon = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.icon : '📝';
    };

    const getCategoryColor = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.color : '#6b7280';
    };

    // Severity helper functions
    const getSeverityInfo = (severity) => {
        const severityMap = {
            'low': {
                label: 'Low Priority',
                color: '#ffffff',
                bgColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgba(16, 185, 129, 1)',
                icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            },
            'medium': {
                label: 'Medium Priority',
                color: '#1f2937',
                bgColor: 'rgba(245, 158, 11, 0.9)',
                borderColor: 'rgba(245, 158, 11, 1)',
                icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                )
            },
            'high': {
                label: 'High Priority',
                color: '#ffffff',
                bgColor: 'rgba(239, 68, 68, 0.9)',
                borderColor: 'rgba(239, 68, 68, 1)',
                icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            }
        };
        
        return severityMap[severity] || {
            label: 'Unknown',
            color: '#ffffff',
            bgColor: 'rgba(107, 114, 128, 0.8)',
            borderColor: 'rgba(107, 114, 128, 1)',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        };
    };

    const handleUpvote = async (complaintId) => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to vote', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }
        
        // Set voting in progress
        setVotingInProgress(prev => ({ ...prev, [`${complaintId}-upvote`]: true }));
        
        try {
            const result = await dispatch(upvoteComplaint(complaintId));
            if (upvoteComplaint.fulfilled.match(result)) {
                toast.success('Upvoted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    icon: <FiThumbsUp />,
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to upvote. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while voting. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear voting in progress
            setVotingInProgress(prev => ({ ...prev, [`${complaintId}-upvote`]: false }));
        }
    };

    const handleDownvote = async (complaintId) => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to vote', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }
        
        // Set voting in progress
        setVotingInProgress(prev => ({ ...prev, [`${complaintId}-downvote`]: true }));
        
        try {
            const result = await dispatch(downvoteComplaint(complaintId));
            if (downvoteComplaint.fulfilled.match(result)) {
                toast.success('Downvoted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    icon: <FiThumbsDown />,
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
            } else {
                toast.error('❌ Failed to downvote. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while voting. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear voting in progress
            setVotingInProgress(prev => ({ ...prev, [`${complaintId}-downvote`]: false }));
        }
    };

    const handleStatusUpdate = async (complaintId, newStatus) => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to update status', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }
        
        // Set status update in progress
        setStatusUpdateInProgress(prev => ({ ...prev, [complaintId]: true }));
        
        try {
            // Map frontend status to backend format
            const backendStatus = mapStatusToBackend(newStatus);
            const result = await dispatch(updateComplaintStatus({ complaintId, status: backendStatus }));
            if (updateComplaintStatus.fulfilled.match(result)) {
                toast.success(`Status updated to ${newStatus.replace('-', ' ')}!`, {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
                // Close modal properly using the closeStatusModal function
                closeStatusModal();
            } else {
                toast.error('❌ Failed to update status. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while updating status. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear status update in progress
            setStatusUpdateInProgress(prev => ({ ...prev, [complaintId]: false }));
        }
    };

    const openStatusModal = (complaint) => {
        // Save current scroll position
        const currentScrollY = window.scrollY;
        setScrollPosition(currentScrollY);
        
        setSelectedComplaintForStatus(complaint);
        setStatusModalOpen(true);
        
        // Apply scroll lock with position fixed approach - most reliable method
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${currentScrollY}px`;
        document.body.style.width = '100%';
        document.body.style.paddingRight = `${scrollBarWidth}px`;
        document.documentElement.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
    };

    const closeStatusModal = () => {
        setStatusModalOpen(false);
        setSelectedComplaintForStatus(null);
        
        // Restore scroll position and remove scroll lock
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        
        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    };

    // Delete modal handlers
    const openDeleteModal = (complaint) => {
        // Save current scroll position
        const currentScrollY = window.scrollY;
        setScrollPosition(currentScrollY);
        
        setSelectedComplaintForDelete(complaint);
        setDeleteModalOpen(true);
        
        // Apply scroll lock
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${currentScrollY}px`;
        document.body.style.width = '100%';
        document.body.style.paddingRight = `${scrollBarWidth}px`;
        document.documentElement.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedComplaintForDelete(null);
        
        // Restore scroll position and remove scroll lock
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        
        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    };

    // Delete complaint handler
    const handleDeleteComplaint = async (complaintId) => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to delete complaint', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }
        
        // Set delete in progress
        setDeleteInProgress(prev => ({ ...prev, [complaintId]: true }));
        
        try {
            const result = await dispatch(deleteComplaint(complaintId));
            if (deleteComplaint.fulfilled.match(result)) {
                toast.success('Complaint deleted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
                // Close modal properly using the closeDeleteModal function
                closeDeleteModal();
            } else {
                toast.error('❌ Failed to delete complaint. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while deleting complaint. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear delete in progress
            setDeleteInProgress(prev => ({ ...prev, [complaintId]: false }));
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<span key={i} className="star filled">★</span>);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<span key={i} className="star half">★</span>);
            } else {
                stars.push(<span key={i} className="star empty">☆</span>);
            }
        }
        return stars;
    };

    const toggleComments = (complaintId) => {
        setExpandedComments(prev => ({
            ...prev,
            [complaintId]: !prev[complaintId]
        }));
    };

    // Comment modal handlers
    const openCommentModal = (complaint) => {
        // Save current scroll position
        const currentScrollY = window.scrollY;
        setScrollPosition(currentScrollY);
        
        setSelectedComplaintForComments(complaint);
        setCommentModalOpen(true);
        setNewComment('');
        setCommentRating(5); // Reset rating to 5 stars
        
        // Fetch comments for this complaint
        dispatch(fetchComments(complaint._id));
        
        // Apply scroll lock
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${currentScrollY}px`;
        document.body.style.width = '100%';
        document.body.style.paddingRight = `${scrollBarWidth}px`;
        document.documentElement.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
    };

    const closeCommentModal = () => {
        setCommentModalOpen(false);
        setSelectedComplaintForComments(null);
        setNewComment('');
        setCommentRating(5); // Reset rating
        setDeletingComment(null); // Reset delete animation
        setUpdatingComment(null); // Reset update animation
        cancelEditingComment(); // Reset edit state
        
        // Restore scroll position and remove scroll lock
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        
        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    };

    // Handle comment submission
    const handleCommentSubmit = async () => {
        if (!newComment.trim()) {
            toast.error('Please enter a comment', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        if (!isAuthenticated) {
            toast.error('🔐 Please log in to comment', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setCommentInProgress(true);
        
        try {
            const result = await dispatch(addComment({
                complaintId: selectedComplaintForComments._id,
                content: newComment.trim(),
                rating: commentRating
            }));

            if (addComment.fulfilled.match(result)) {
                // Clear the input first
                setNewComment('');
                setCommentRating(5); // Reset rating
                
                // Fetch updated comments from server
                await dispatch(fetchComments(selectedComplaintForComments._id));
                
                toast.success('Comment added successfully!', {
                    duration: 3000,
                    position: 'top-center',
                    icon: <FiMessageCircle />,
                });
            } else {
                // Handle the error case
                const errorMessage = result.payload || 'Failed to add comment';
                toast.error(`❌ ${errorMessage}`, {
                    duration: 3000,
                    position: 'top-center',
                });
            }

        } catch (error) {
            toast.error('❌ Failed to add comment. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setCommentInProgress(false);
        }
    };

    // Start editing a comment
    const startEditingComment = (comment) => {
        setEditingComment(comment._id || comment.id);
        setEditedCommentText(comment.comment || comment.content);
        setEditedCommentRating(comment.rating || 5);
    };

    // Cancel editing a comment
    const cancelEditingComment = () => {
        setEditingComment(null);
        setEditedCommentText('');
        setEditedCommentRating(5);
    };

    // Save edited comment
    const saveEditedComment = async (commentId) => {
        if (!editedCommentText.trim()) {
            toast.error('Comment cannot be empty', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setEditInProgress(true);
        setUpdatingComment(commentId); // Start update animation
        
        try {
            // You'll need to implement updateComment in your Redux slice
            const result = await dispatch(updateComment({
                commentId,
                comment: editedCommentText.trim(),
                rating: editedCommentRating
            }));

            if (result.type === 'comments/updateComment/fulfilled') {
                // Wait for animation before refreshing
                setTimeout(async () => {
                    await dispatch(fetchComments(selectedComplaintForComments._id));
                    setUpdatingComment(null); // Reset animation state
                    
                    toast.success('Comment updated successfully!', {
                        duration: 3000,
                        position: 'top-center',
                        icon: '✏️',
                    });
                }, 500); // 500ms animation duration for update
                
                cancelEditingComment();
            } else {
                setUpdatingComment(null); // Reset animation state
                toast.error('Failed to update comment', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            setUpdatingComment(null); // Reset animation state
            toast.error('Failed to update comment. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setEditInProgress(false);
        }
    };

    // Delete a comment
    const deleteComment = async (commentId) => {
        // Start delete animation
        setDeletingComment(commentId);
        
        // Wait for animation to complete before making API call
        setTimeout(async () => {
            try {
                const result = await dispatch(removeComment(commentId));

                if (result.type === 'comments/removeComment/fulfilled') {
                    // Refresh comments after animation
                    await dispatch(fetchComments(selectedComplaintForComments._id));
                    
                    toast.success('Comment deleted successfully!', {
                        duration: 3000,
                        position: 'top-center',
                        icon: '🗑️',
                    });
                } else {
                    // Reset animation state if API fails
                    setDeletingComment(null);
                    toast.error('Failed to delete comment', {
                        duration: 3000,
                        position: 'top-center',
                    });
                }
            } catch (error) {
                // Reset animation state if error occurs
                setDeletingComment(null);
                toast.error('Failed to delete comment. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        }, 300); // 300ms animation duration
    };

    // Handler functions for CommentModal component
    const handleModalCommentSubmit = async (commentData) => {
        try {
            const result = await dispatch(addComment({
                complaintId: commentData.complaintId,
                content: commentData.comment,
                rating: commentData.rating
            }));

            if (addComment.fulfilled.match(result)) {
                // Fetch updated comments
                await dispatch(fetchComments(selectedComplaintForComments._id));
            } else {
                throw new Error(result.payload || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    };

    const handleModalCommentUpdate = async (commentId, updateData) => {
        try {
            const result = await dispatch(updateComment({
                commentId,
                comment: updateData.comment,
                rating: updateData.rating
            }));

            if (result.type === 'comments/updateComment/fulfilled') {
                // Fetch updated comments
                await dispatch(fetchComments(selectedComplaintForComments._id));
            } else {
                throw new Error('Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    };

    const handleModalCommentDelete = async (commentId) => {
        try {
            const result = await dispatch(removeComment(commentId));

            if (result.type === 'comments/removeComment/fulfilled') {
                // Fetch updated comments
                await dispatch(fetchComments(selectedComplaintForComments._id));
            } else {
                throw new Error('Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    };

    // Function to highlight matching text
    const highlightText = (text, searchQuery) => {
        if (!searchQuery.trim()) return text;
        
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, index) => {
            if (regex.test(part)) {
                return <span key={index} className="search-highlight">{part}</span>;
            }
            return part;
        });
    };

    // Handle tab change and update URL
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Update URL without causing page reload
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.pushState({}, '', url);
    };

    // Filter complaints based on search query and category
    const filteredComplaints = complaints.filter(complaint => {
        // Category filter
        const categoryMatch = selectedCategory === 'all' || complaint.category === selectedCategory;
        
        // Search filter - search in title and description
        const searchMatch = searchQuery === '' || 
        complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        return categoryMatch && searchMatch;
    });
    console.log("These are the filtered complaints: ", filteredComplaints);

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
                <div className={`complaint-container ${activeTab === 'view' ? 'complaint-container-wide' : ''}`}>
                    <div className="complaint-header">
                        <h1 className="complaint-title">Complaint Management</h1>
                        <p className="complaint-subtitle">Submit new complaints or view your existing ones</p>
                    </div>

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
                        <button 
                            className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
                            onClick={() => handleTabChange('view')}
                        >
                            <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            My Complaints
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

                        {/* Severity Field */}
                        <div className="form-group">
                            <label htmlFor="severity" className="form-label">
                                <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Severity Level *
                            </label>
                            <div className="severity-container">
                                <div className="severity-options">
                                    <label className={`severity-option severity-low ${formData.severity === 'low' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="severity"
                                            value="low"
                                            checked={formData.severity === 'low'}
                                            onChange={handleInputChange}
                                            className="severity-radio"
                                        />
                                        <div className="severity-card">
                                            <div className="severity-icon-wrapper">
                                                <svg className="severity-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="severity-pulse"></div>
                                            </div>
                                            <div className="severity-content">
                                                <div className="severity-header">
                                                    <span className="severity-label">Low Priority</span>
                                                    <div className="severity-badge severity-badge-low">
                                                        <span className="severity-dot"></span>
                                                        Low
                                                    </div>
                                                </div>
                                                <span className="severity-description">
                                                    General issues that need to be noted and addressed when convenient
                                                </span>
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`severity-option severity-medium ${formData.severity === 'medium' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="severity"
                                            value="medium"
                                            checked={formData.severity === 'medium'}
                                            onChange={handleInputChange}
                                            className="severity-radio"
                                        />
                                        <div className="severity-card">
                                            <div className="severity-icon-wrapper">
                                                <svg className="severity-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                </svg>
                                                <div className="severity-pulse"></div>
                                            </div>
                                            <div className="severity-content">
                                                <div className="severity-header">
                                                    <span className="severity-label">Medium Priority</span>
                                                    <div className="severity-badge severity-badge-medium">
                                                        <span className="severity-dot"></span>
                                                        Medium
                                                    </div>
                                                </div>
                                                <span className="severity-description">
                                                    Issues requiring prompt attention and timely action
                                                </span>
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`severity-option severity-high ${formData.severity === 'high' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="severity"
                                            value="high"
                                            checked={formData.severity === 'high'}
                                            onChange={handleInputChange}
                                            className="severity-radio"
                                        />
                                        <div className="severity-card">
                                            <div className="severity-icon-wrapper">
                                                <svg className="severity-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="severity-pulse"></div>
                                            </div>
                                            <div className="severity-content">
                                                <div className="severity-header">
                                                    <span className="severity-label">High Priority</span>
                                                    <div className="severity-badge severity-badge-high">
                                                        <span className="severity-dot"></span>
                                                        Emergency
                                                    </div>
                                                </div>
                                                <span className="severity-description">
                                                    Critical emergencies requiring immediate attention
                                                </span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Description Field */}
                        {/* Rail Specific: Train Number (moved before description) */}
                        {formData.category === 'rail' && (
                            <div className="form-group">
                                <label htmlFor="trainNumber" className="form-label">
                                    <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M9 21V3m6 0v18" />
                                    </svg>
                                    Train Number *
                                </label>
                                <input
                                    type="text"
                                    id="trainNumber"
                                    name="trainNumber"
                                    value={formData.trainNumber}
                                    onChange={(e) => {
                                        const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0,5);
                                        setFormData(prev => ({ ...prev, trainNumber: digitsOnly }));
                                    }}
                                    className="form-input"
                                    placeholder="e.g., 12345"
                                    inputMode="numeric"
                                    pattern="[0-9]{5}"
                                    maxLength={5}
                                    title="Enter exactly 5 digits (0-9)"
                                    required
                                />
                                <p className="helper-text" style={{ marginTop: '6px', fontSize: '0.85rem', color: '#9ca3af' }}>
                                    Enter the 5-digit train number (digits only).
                                </p>
                            </div>
                        )}

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
                                                <span><FiMapPin style={{marginRight: '5px'}} /> {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}</span>
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
                                                <span><FiMapPin style={{marginRight: '5px'}} /> {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}</span>
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
                    )}

                    {/* View Complaints Section */}
                    {activeTab === 'view' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h2 className="section-title">My Complaints</h2>
                                <p className="section-subtitle">Track the status of your submitted complaints</p>
                            </div>

                            <div className="complaints-list">
                                {/* Search and Filter Section */}
                                {!isLoading && !error && isAuthenticated && complaints.length > 0 && (
                                    <div className="search-filter-section">
                                        <div className="search-bar-container">
                                            <div className="search-input-wrapper">
                                                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                <input
                                                    type="text"
                                                    className="search-input"
                                                    placeholder="Search complaints by title or description..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                                {searchQuery && (
                                                    <button 
                                                        className="clear-search-btn"
                                                        onClick={() => setSearchQuery('')}
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="category-filter-wrapper">
                                                <select
                                                    className="category-filter"
                                                    value={selectedCategory}
                                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                                >
                                                    <option value="all">All Categories</option>
                                                    {categories.map(category => (
                                                        <option key={category.value} value={category.value}>
                                                            {category.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {/* Results Summary */}
                                        <div className="results-summary">
                                            <span className="results-count">
                                                Showing {filteredComplaints.length} of {complaints.length} complaints
                                            </span>
                                            {(searchQuery || selectedCategory !== 'all') && (
                                                <button 
                                                    className="clear-filters-btn"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSelectedCategory('all');
                                                    }}
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isLoading ? (
                                    <div className="loading-state">
                                        <div className="loading-spinner"></div>
                                        <p>Loading your complaints...</p>
                                    </div>
                                ) : error ? (
                                    <div className="error-state">
                                        <div className="error-icon">❌</div>
                                        <h3>Error Loading Complaints</h3>
                                        <p>{error}</p>
                                        <button 
                                            className="retry-btn"
                                            onClick={() => dispatch(getUserComplaints())}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : !isAuthenticated ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">🔐</div>
                                        <h3>Authentication Required</h3>
                                        <p>Please log in to view your complaints</p>
                                    </div>
                                ) : complaints.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">📝</div>
                                        <h3>No Complaints Found</h3>
                                        <p>You haven't submitted any complaints yet. Switch to the "Register Complaint" tab to submit your first complaint.</p>
                                        <button 
                                            className="switch-tab-btn"
                                            onClick={() => handleTabChange('register')}
                                        >
                                            Register New Complaint
                                        </button>
                                    </div>
                                ) : filteredComplaints.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">🔍</div>
                                        <h3>No Complaints Found</h3>
                                        <p>
                                            {searchQuery && selectedCategory !== 'all' 
                                                ? `No complaints found matching "${searchQuery}" in ${categories.find(cat => cat.value === selectedCategory)?.label || selectedCategory} category.`
                                                : searchQuery 
                                                ? `No complaints found matching "${searchQuery}".`
                                                : `No complaints found in ${categories.find(cat => cat.value === selectedCategory)?.label || selectedCategory} category.`
                                            }
                                        </p>
                                        <button 
                                            className="clear-filters-btn"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSelectedCategory('all');
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="complaints-grid">
                                        {filteredComplaints.map((complaint, index) => (
                                            <div key={complaint._id || index} className="complaint-card">
                                                <div className="complaint-card-header">
                                                    <div className="complaint-card-header-left">
                                                        <div className="complaint-category">
                                                            <span 
                                                                className="category-icon-display"
                                                                style={{ color: getCategoryColor(complaint.category) }}
                                                            >
                                                                {getCategoryIcon(complaint.category)}
                                                            </span>
                                                            <span className="category-name">
                                                                {categories.find(cat => cat.value === complaint.category)?.label || complaint.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="card-header-right">
                                                        <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                                                            {mapStatusToFrontend(complaint.status).replace('-', ' ').toUpperCase()}
                                                        </span>
                                                        <button
                                                            className="delete-btn-icon"
                                                            onClick={() => openDeleteModal(complaint)}
                                                            disabled={deleteInProgress[complaint._id]}
                                                            title="Delete Complaint"
                                                        >
                                                            {deleteInProgress[complaint._id] ? (
                                                                <div className="btn-spinner-small"></div>
                                                            ) : (
                                                                <svg className="delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="complaint-card-body">
                                                    <div className="complaint-title-section">
                                                        <h4 className="complaint-title-display">
                                                            {searchQuery ? highlightText(complaint.title, searchQuery) : complaint.title}
                                                        </h4>
                                                        
                                                        {/* Severity Display */}
                                                        {complaint.severity && (
                                                            <div className="complaint-severity">
                                                                <div 
                                                                    className="severity-badge-display"
                                                                    style={{
                                                                        color: getSeverityInfo(complaint.severity).color,
                                                                        backgroundColor: getSeverityInfo(complaint.severity).bgColor,
                                                                        border: `1px solid ${getSeverityInfo(complaint.severity).borderColor}`
                                                                    }}
                                                                >
                                                                    <span className="severity-icon-display" style={{ color: getSeverityInfo(complaint.severity).color }}>
                                                                        {getSeverityInfo(complaint.severity).icon}
                                                                    </span>
                                                                    <span className="severity-text">
                                                                        {getSeverityInfo(complaint.severity).label}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="complaint-description-display">
                                                        {searchQuery ? highlightText(complaint.description, searchQuery) : complaint.description}
                                                    </p>
                                                    
                                                    {complaint.address && (
                                                        <div className="complaint-location">
                                                            <svg className="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span>{complaint.address}</span>
                                                        </div>
                                                    )}

                                                    {/* Rail specific train meta */}
                                                    {complaint.category === 'rail' && complaint.category_specific_data && (
                                                        <div className="rail-train-meta">
                                                            <div className="train-header-line">
                                                                <div className="train-title-wrap">
                                                                    <span className="train-emoji" role="img" aria-label="train details"><MdDirectionsRailway /></span>
                                                                    <span className="train-name-text">{complaint.category_specific_data.train_name || complaint.category_specific_data.trainNumber || complaint.category_data_id}</span>
                                                                    <span className="train-number-pill">{complaint.category_specific_data.train_number || complaint.category_data_id}</span>
                                                                </div>
                                                                {complaint.category_specific_data.train_type && (
                                                                    <span className="train-type-badge" title="Train Type">{complaint.category_specific_data.train_type.replace(/_/g,' ')}</span>
                                                                )}
                                                            </div>
                                                            <div className="train-route-grid">
                                                                {(complaint.category_specific_data.routes?.from_station) && (
                                                                    <div className="route-segment from">
                                                                        <div className="seg-label">Origin</div>
                                                                        <div className="seg-station">
                                                                            <span className="station-name origin-name">{complaint.category_specific_data.routes.from_station.name}</span>
                                                                            <span className="code origin-code">({complaint.category_specific_data.routes.from_station.code})</span>
                                                                        </div>
                                                                        {complaint.category_specific_data.routes.from_station.time && (
                                                                            <div className="seg-time">Dep: {complaint.category_specific_data.routes.from_station.time.replace('.', ':')}</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {(complaint.category_specific_data.routes?.to_station) && (
                                                                    <div className="route-segment to">
                                                                        <div className="seg-label">Destination</div>
                                                                        <div className="seg-station">
                                                                            <span className="station-name destination-name">{complaint.category_specific_data.routes.to_station.name}</span>
                                                                            <span className="code destination-code">({complaint.category_specific_data.routes.to_station.code})</span>
                                                                        </div>
                                                                        {complaint.category_specific_data.routes.to_station.time && (
                                                                            <div className="seg-time">Arr: {complaint.category_specific_data.routes.to_station.time.replace('.', ':')}</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(complaint.category_specific_data.frequency || complaint.category_specific_data.total_distance || complaint.category_specific_data.avg_speed) && (
                                                                <div className="train-extra">
                                                                    {complaint.category_specific_data.frequency && (
                                                                        <div className="freq-row">
                                                                            {(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map((d,i) => (
                                                                                <span key={d} className={`day-chip ${complaint.category_specific_data.frequency[i] ? 'active' : ''}`}>{d[0]}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="stats-row">
                                                                        {complaint.category_specific_data.total_distance && (
                                                                            <span className="stat-chip" title="Total Distance">{complaint.category_specific_data.total_distance} km</span>
                                                                        )}
                                                                        {complaint.category_specific_data.avg_speed && (
                                                                            <span className="stat-chip" title="Average Speed">{complaint.category_specific_data.avg_speed} km/h</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Voting Section */}
                                                    <div className="complaint-voting">
                                                        <button 
                                                            className={`vote-btn upvote-btn ${votingInProgress[`${complaint._id}-upvote`] ? 'voting' : ''}`}
                                                            onClick={() => handleUpvote(complaint._id)}
                                                            disabled={votingInProgress[`${complaint._id}-upvote`] || votingInProgress[`${complaint._id}-downvote`]}
                                                        >
                                                            {votingInProgress[`${complaint._id}-upvote`] ? (
                                                                <div className="vote-spinner"></div>
                                                            ) : (
                                                                <svg className="vote-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                                                </svg>
                                                            )}
                                                            <span className="vote-count">
                                                                {complaint.upvote || 0}
                                                            </span>
                                                        </button>
                                                        
                                                        <button 
                                                            className={`vote-btn downvote-btn ${votingInProgress[`${complaint._id}-downvote`] ? 'voting' : ''}`}
                                                            onClick={() => handleDownvote(complaint._id)}
                                                            disabled={votingInProgress[`${complaint._id}-upvote`] || votingInProgress[`${complaint._id}-downvote`]}
                                                        >
                                                            {votingInProgress[`${complaint._id}-downvote`] ? (
                                                                <div className="vote-spinner"></div>
                                                            ) : (
                                                                <svg className="vote-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                                                </svg>
                                                            )}
                                                            <span className="vote-count">
                                                                {complaint.downvote || 0}
                                                            </span>
                                                        </button>

                                                        {/* Comments Button */}
                                                        <button 
                                                            className="vote-btn comment-btn"
                                                            onClick={() => openCommentModal(complaint)}
                                                        >
                                                            <svg className="vote-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                                                            </svg>
                                                            <span className="vote-count">
                                                                {(complaint.comments && complaint.comments.length) || 0}
                                                            </span>
                                                        </button>

                                                        {/* Old Comments Button - Keep for backward compatibility */}
                                                        {complaint.feedback_id && (
                                                            <button 
                                                                className="comments-btn"
                                                                onClick={() => toggleComments(complaint._id)}
                                                            >
                                                                <svg className="comment-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                                                                </svg>
                                                                <span>{expandedComments[complaint._id] ? 'Hide Feedback' : 'Show Feedback'}</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Status Update Section */}
                                                    <div className="complaint-status-update">
                                                        <button
                                                            className="status-update-btn"
                                                            onClick={() => openStatusModal(complaint)}
                                                            disabled={statusUpdateInProgress[complaint._id]}
                                                        >
                                                            {statusUpdateInProgress[complaint._id] ? (
                                                                <>
                                                                    <div className="btn-spinner"></div>
                                                                    <span>Updating...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    <span>Update Status</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Feedback Section */}
                                                    {complaint.feedback_id && expandedComments[complaint._id] && (
                                                        <div className="complaint-feedback">
                                                            <div className="feedback-header">
                                                                <h5 className="feedback-title">Feedback</h5>
                                                                <div className="feedback-rating">
                                                                    {renderStars(complaint.rating || 0)}
                                                                    <span className="rating-value">({complaint.rating || 0}/5)</span>
                                                                </div>
                                                            </div>
                                                            
                                                            {complaint.comment && (
                                                                <div className="feedback-comment">
                                                                    <p>"{complaint.comment}"</p>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="feedback-meta">
                                                                <span className="feedback-date">
                                                                    Feedback given: {formatDate(complaint.updatedAt || complaint.createdAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="complaint-meta">
                                                        <div className="complaint-date">
                                                            <svg className="date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span>Submitted: {formatDate(complaint.createdAt || complaint.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Update Modal */}
            {statusModalOpen && selectedComplaintForStatus && (
                <div className="complaint-status-modal-overlay" onClick={closeStatusModal}>
                    <div className="status-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Update Complaint Status</h3>
                            <button className="modal-close-btn" onClick={closeStatusModal}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="complaint-info">
                                <h4 className="complaint-title-modal">{selectedComplaintForStatus.title}</h4>
                                <div className="current-status">
                                    Current Status: 
                                    <span className={`status-badge ${getStatusBadgeClass(selectedComplaintForStatus.status)}`}>
                                        {mapStatusToFrontend(selectedComplaintForStatus.status)?.replace('-', ' ').toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="status-options">
                                <h5 className="status-options-title">Select New Status:</h5>
                                <div className="status-buttons-grid">
                                    {['pending', 'in-progress', 'resolved', 'rejected']
                                        .filter(status => {
                                            // Convert current status to frontend format for comparison
                                            const currentFrontendStatus = mapStatusToFrontend(selectedComplaintForStatus.status);
                                            return status !== currentFrontendStatus;
                                        })
                                        .map(status => (
                                            <button
                                                key={status}
                                                className={`status-option-btn status-${status}`}
                                                onClick={() => handleStatusUpdate(selectedComplaintForStatus._id, status)}
                                                disabled={statusUpdateInProgress[selectedComplaintForStatus._id]}
                                            >
                                                <div className="status-option-content">
                                                    <div className={`status-icon-circle status-${status}`}>
                                                        {status === 'pending' && '⏳'}
                                                        {status === 'in-progress' && '🔄'}
                                                        {status === 'resolved' && '✅'}
                                                        {status === 'rejected' && '❌'}
                                                    </div>
                                                    <span className="status-option-label">
                                                        {status.replace('-', ' ').toUpperCase()}
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                            
                            {statusUpdateInProgress[selectedComplaintForStatus._id] && (
                                <div className="modal-loading">
                                    <div className="modal-spinner"></div>
                                    <span>Updating status...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && selectedComplaintForDelete && (
                <div className="delete-modal-overlay" onClick={closeDeleteModal}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3 className="delete-modal-title">Delete Complaint</h3>
                            <button className="delete-modal-close-btn" onClick={closeDeleteModal}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="delete-modal-content">
                            <div className="delete-modal-icon">
                                <svg className="delete-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            
                            <div className="delete-confirmation-content">
                                <h4 className="delete-complaint-title">{selectedComplaintForDelete.title}</h4>
                                <p className="delete-warning-text">
                                    Are you sure you want to delete this complaint? This action cannot be undone.
                                </p>
                                
                                <div className="delete-actions">
                                    <button
                                        className="cancel-delete-btn"
                                        onClick={closeDeleteModal}
                                        disabled={deleteInProgress[selectedComplaintForDelete._id]}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="confirm-delete-btn"
                                        onClick={() => handleDeleteComplaint(selectedComplaintForDelete._id)}
                                        disabled={deleteInProgress[selectedComplaintForDelete._id]}
                                    >
                                        {deleteInProgress[selectedComplaintForDelete._id] ? (
                                            <>
                                                <div className="btn-spinner"></div>
                                                <span>Deleting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span>Delete Complaint</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comment Modal */}
            <CommentModal
                complaintId={selectedComplaintForComments?._id}
                complaintTitle={selectedComplaintForComments?.title}
                complaintCategory={selectedComplaintForComments?.category}
                complaintType={selectedComplaintForComments?.type}
                isOpen={commentModalOpen}
                onClose={closeCommentModal}
                onCommentSubmit={handleModalCommentSubmit}
                onCommentUpdate={handleModalCommentUpdate}
                onCommentDelete={handleModalCommentDelete}
                comments={selectedComplaintForComments?.comments || []}
                totalComments={selectedComplaintForComments?.comments?.length || 0}
            />

            <Footer />
            {/* Nested route content (e.g., follow-up) will render here */}
            <Outlet />
        </>
    );
}