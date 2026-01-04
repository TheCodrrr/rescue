import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Upload, User, Mail, Phone, Lock, Camera, X, Shield, Train, Construction, Flame, AlertTriangle, Scale, Building2, MapPin, Navigation } from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginSuccess, verifyDepartmentSecret, registerUser, loginUser } from "./redux/authSlice";
import axiosInstance from "../api/axios.js";
import toast, { Toaster } from "react-hot-toast";

export default function Signup() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "citizen",
        category: "",
        department_id: "",
        department_secret: "",
        profileImage: null,
        latitude: null,
        longitude: null,
        address: ""
    });
    const [sendData, setSendData] = useState({
        email: "",
        password: "",
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [showDepartmentSecret, setShowDepartmentSecret] = useState(false);
    const [isVerifyingSecret, setIsVerifyingSecret] = useState(false);
    const [isSecretVerified, setIsSecretVerified] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    
    // Department caching state
    const [allDepartments, setAllDepartments] = useState([]);
    const [departmentsByCategory, setDepartmentsByCategory] = useState({
        rail: [],
        road: [],
        fire: [],
        cyber: [],
        police: [],
        court: []
    });
    const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(false);
    const [categoryDepartmentsLoading, setCategoryDepartmentsLoading] = useState(false);
    const hasFetchedDepartments = useRef(false);
    const hasPrefetchedCategories = useRef(false);
    
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRoleChange = (e) => {
        const selectedRole = e.target.value;
        setFormData(prev => ({
            ...prev,
            role: selectedRole,
            category: selectedRole === 'officer' ? '' : prev.category, // Reset category if not officer
            department_id: "", // Reset department when role changes
            department_secret: "" // Reset department secret when role changes
        }));
        setIsSecretVerified(false); // Reset verification status
    };

    // Fetch all departments on component mount
    useEffect(() => {
        const fetchAllDepartments = async () => {
            if (hasFetchedDepartments.current) return;
            
            try {
                setIsDepartmentsLoading(true);
                const response = await axiosInstance.get('/departments');
                
                if (response.data && response.data.data) {
                    setAllDepartments(response.data.data);
                    hasFetchedDepartments.current = true;
                    // console.log('✅ All departments fetched and cached:', response.data.data.length);
                }
            } catch (error) {
                console.error('❌ Error fetching departments:', error);
                // Don't show error toast as this is a background operation
            } finally {
                setIsDepartmentsLoading(false);
            }
        };

        fetchAllDepartments();
    }, []);

    // Prefetch departments by category when officer role is selected
    useEffect(() => {
        const prefetchDepartmentsByCategory = async () => {
            if (formData.role !== 'officer' || hasPrefetchedCategories.current) return;

            try {
                setCategoryDepartmentsLoading(true);
                const categories = ['rail', 'road', 'fire', 'cyber', 'police', 'court'];
                
                // Fetch all categories in parallel
                const promises = categories.map(category =>
                    axiosInstance.get(`/departments/category/${category}`)
                        .then(res => ({ category, data: res.data.data }))
                        .catch(err => {
                            console.warn(`⚠️ Failed to fetch ${category} departments:`, err.message);
                            return { category, data: [] };
                        })
                );

                const results = await Promise.all(promises);
                
                // Update state with fetched departments
                const categorizedDepts = {};
                results.forEach(({ category, data }) => {
                    categorizedDepts[category] = data || [];
                });

                setDepartmentsByCategory(categorizedDepts);
                hasPrefetchedCategories.current = true;
                // console.log('✅ Departments by category prefetched and cached');
            } catch (error) {
                console.error('❌ Error prefetching departments by category:', error);
            } finally {
                setCategoryDepartmentsLoading(false);
            }
        };

        prefetchDepartmentsByCategory();
    }, [formData.role]);

    // Function to get user's current location
    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Update form data with coordinates
                setFormData(prev => ({
                    ...prev,
                    latitude,
                    longitude
                }));

                // Reverse geocode to get address
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    const address = data.display_name || '';
                    
                    setFormData(prev => ({
                        ...prev,
                        address
                    }));

                    toast.success('Location fetched successfully!');
                } catch (error) {
                    console.error('Error getting address:', error);
                    toast.error('Got coordinates but failed to get address');
                } finally {
                    setIsFetchingLocation(false);
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                setIsFetchingLocation(false);
                toast.error('Failed to get location. Please enter manually or allow location access.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleImageChange = (e) => {
        const file = e?.target?.files[0] || 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png';
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select a valid image file');
                return;
            }
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB');
                return;
            }

            setFormData(prev => ({
                ...prev,
                profileImage: file
            }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        if (!formData.profileImage && !imagePreview) {
            toast.error('No image to remove');
            return;
        }

        setFormData(prev => ({
            ...prev,
            profileImage: null
        }));
        setImagePreview(null);
        toast.success('Image removed successfully');
    };

    const handleDepartmentSelect = (deptId) => {
        setFormData(prev => ({ ...prev, department_id: deptId, department_secret: "" }));
        setIsSecretVerified(false); // Reset verification when department changes
    };

    const handleVerifySecret = async () => {
        if (!formData.department_id) {
            toast.error('Please select a department first');
            return;
        }

        if (!formData.department_secret) {
            toast.error('Please enter department secret');
            return;
        }

        setIsVerifyingSecret(true);
        try {
            const result = await dispatch(verifyDepartmentSecret({
                department_id: formData.department_id,
                department_secret: formData.department_secret
            })).unwrap();

            setIsSecretVerified(true);
            toast.success('Department secret verified successfully!');
        } catch (error) {
            setIsSecretVerified(false);
            toast.error(error || 'Failed to verify department secret');
        } finally {
            setIsVerifyingSecret(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.name || !formData.email || !formData.password || !formData.phone) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Category validation for officers
        if (formData.role === 'officer' && !formData.category) {
            toast.error('Please select a category for officer role');
            return;
        }

        // Department validation for officers
        if (formData.role === 'officer' && !formData.department_id) {
            toast.error('Please select a department');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        // Phone validation (basic)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
            toast.error('Please enter a valid phone number');
            return;
        }

        // Password validation
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);

        try {
            // For officers: Verify department secret first if not already verified
            if (formData.role === 'officer' && !isSecretVerified) {
                if (!formData.department_secret) {
                    toast.error('Please enter your department secret');
                    setIsLoading(false);
                    return;
                }

                toast.loading('Verifying department secret...');
                try {
                    await dispatch(verifyDepartmentSecret({
                        department_id: formData.department_id,
                        department_secret: formData.department_secret
                    })).unwrap();
                    
                    setIsSecretVerified(true);
                    toast.dismiss();
                    toast.success('Department secret verified!');
                } catch (error) {
                    toast.dismiss();
                    toast.error(error || 'Invalid department secret. Please verify before registering.');
                    setIsLoading(false);
                    return;
                }
            }

            // Create FormData for multipart/form-data
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('password', formData.password);
            formDataToSend.append('phone', formData.phone);
            formDataToSend.append('role', formData.role);
            
            // Add location data if available
            if (formData.latitude !== null && formData.longitude !== null) {
                formDataToSend.append('latitude', formData.latitude);
                formDataToSend.append('longitude', formData.longitude);
            }
            if (formData.address) {
                formDataToSend.append('address', formData.address);
            }
            
            // Add category and department if user is an officer
            if (formData.role === 'officer' && formData.category) {
                formDataToSend.append('category', formData.category);
            }
            
            if (formData.role === 'officer' && formData.department_id) {
                formDataToSend.append('department_id', formData.department_id);
            }
            
            if (formData.profileImage) {
                formDataToSend.append('profileImage', formData.profileImage);
            }

            // Register user using Redux
            await dispatch(registerUser(formDataToSend)).unwrap();
            toast.success('Account created successfully!');

            // After successful signup, try to log the user in automatically using Redux
            try {
                const loginResult = await dispatch(loginUser({
                    email: formData.email,
                    password: formData.password
                })).unwrap();
                
                toast.success('Login successful! Redirecting...');
                
                // Reset form
                setFormData({
                    name: "",
                    email: "",
                    password: "",
                    phone: "",
                    role: "citizen",
                    category: "",
                    department_id: "",
                    department_secret: "",
                    profileImage: null,
                    latitude: null,
                    longitude: null,
                    address: ""
                });
                setImagePreview(null);
                setIsSecretVerified(false);
                
                // Navigate to home after a brief delay
                setTimeout(() => {
                    navigate("/");
                }, 1500);
            } catch (loginError) {
                console.error('Auto-login after signup failed:', loginError);
                // Don't show error, just redirect to login
                toast.success('Account created! Please login to continue.');
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            
            if (typeof error === 'string') {
                toast.error(error);
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error.response?.status === 400) {
                toast.error('Invalid input data. Please check your information.');
            } else if (error.response?.status === 409) {
                toast.error('User already exists with this email or phone.');
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center py-4 px-4 relative overflow-hidden">
            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
                }
            `}</style>
            
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-32 right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
            </div>
            
            <Toaster position="top-right" />
            
            <div className="max-w-5xl w-full relative z-10">
                {/* Main Glass Container */}
                <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                    <div className="grid lg:grid-cols-5 min-h-[650px]">
                        
                        {/* Left Side - Photo Upload (2 columns) */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl p-6 flex flex-col items-center justify-center relative border-r border-white/10">
                            {/* Floating Glass Elements */}
                            <div className="absolute top-8 left-8 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 animate-float"></div>
                            <div className="absolute bottom-16 right-8 w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl border border-white/25 animate-float" style={{animationDelay: '1s'}}></div>
                            <div className="absolute top-1/3 right-4 w-8 h-8 bg-white/25 backdrop-blur-sm rounded-lg border border-white/35 animate-float" style={{animationDelay: '2s'}}></div>

                            <div className="relative z-10 text-center mb-6">
                                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Welcome to Lodge!</h2>
                                <p className="text-white/80 text-sm drop-shadow-md">Create your account and join our community</p>
                            </div>
                            
                            {/* Profile Image Upload Section */}
                            <div className="relative z-10 flex flex-col items-center space-y-4">
                                <div className="relative group">
                                    {/* Glass Profile Container */}
                                    <div className="w-36 h-36 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30 group-hover:border-white/50 group-hover:bg-white/25 transition-all duration-500 shadow-2xl">
                                        {imagePreview ? (
                                            <img 
                                                src={imagePreview} 
                                                alt="Profile preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Camera className="h-16 w-16 text-white/90 drop-shadow-lg" />
                                        )}
                                    </div>
                                    
                                    {/* Glass Upload Button */}
                                    <label 
                                        htmlFor="profileImage" 
                                        className="absolute -bottom-3 -right-3 bg-white/30 backdrop-blur-xl text-white rounded-full p-4 cursor-pointer hover:bg-white/40 hover:scale-110 transition-all duration-300 shadow-2xl border border-white/40"
                                    >
                                        <Upload className="h-6 w-6 drop-shadow-sm" />
                                    </label>

                                    {/* Glass Remove Button - Only show when image exists */}
                                    {(imagePreview || formData.profileImage) && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute -bottom-3 -left-3 bg-red-500/30 backdrop-blur-xl text-white rounded-full p-4 cursor-pointer hover:bg-red-500/40 hover:scale-110 transition-all duration-300 shadow-2xl border border-red-400/40"
                                        >
                                            <X className="h-6 w-6 drop-shadow-sm" />
                                        </button>
                                    )}
                                    
                                    <input
                                        id="profileImage"
                                        name="profileImage"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </div>
                                
                                <div className="text-center">
                                    <p className="text-white font-semibold mb-1 drop-shadow-md">Profile Picture</p>
                                    <p className="text-white/70 text-xs drop-shadow-sm">Click the + icon to upload</p>
                                    <p className="text-white/60 text-xs mt-1 drop-shadow-sm">(Optional, max 5MB)</p>
                                </div>
                            </div>
                            
                            {/* Glass Quote Container */}
                            <div className="relative z-10 mt-8 text-center">
                                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-xl">
                                    <div className="flex space-x-1 justify-center mb-3">
                                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse shadow-sm"></div>
                                        <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse shadow-sm" style={{animationDelay: '0.5s'}}></div>
                                        <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse shadow-sm" style={{animationDelay: '1s'}}></div>
                                    </div>
                                    <p className="text-white/90 text-sm italic font-light drop-shadow-md">"Your journey begins with a single step"</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Form Fields (3 columns) */}
                        <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white/5 backdrop-blur-lg">
                            <div className="w-full max-w-lg">
                                {/* Glass Header */}
                                <div className="mb-6 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl">
                                    <div className="flex items-center mb-3">
                                        <div className="h-12 w-12 bg-gradient-to-r from-white/30 to-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center mr-4 shadow-lg border border-white/30">
                                            <User className="h-6 w-6 text-white drop-shadow-sm" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">Create Account</h3>
                                            <p className="text-white/80 text-sm drop-shadow-md">Fill in your details to get started</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Glass Form Container */}
                                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Name and Email Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Glass Name Field */}
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Full Name *
                                                </label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                                                    <input
                                                        id="name"
                                                        name="name"
                                                        type="text"
                                                        required
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        className="pl-10 w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                            </div>

                                            {/* Glass Email Field */}
                                            <div>
                                                <label htmlFor="email" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Email Address *
                                                </label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                                                    <input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        required
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        className="pl-10 w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="john@example.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phone and Password Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Glass Phone Field */}
                                            <div>
                                                <label htmlFor="phone" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Phone Number *
                                                </label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                                                    <input
                                                        id="phone"
                                                        name="phone"
                                                        type="tel"
                                                        required
                                                        value={formData.phone}
                                                        onChange={handleInputChange}
                                                        className="pl-10 w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="+1 (555) 123-4567"
                                                    />
                                                </div>
                                            </div>

                                            {/* Glass Password Field */}
                                            <div>
                                                <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Password *
                                                </label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                                                    <input
                                                        id="password"
                                                        name="password"
                                                        type={showPassword ? "text" : "password"}
                                                        required
                                                        value={formData.password}
                                                        onChange={handleInputChange}
                                                        className="pl-10 pr-12 w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 rounded-lg border border-white/20 backdrop-blur-sm transition-colors duration-200 no-hover-transform"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-white/70 mt-1.5 drop-shadow-sm">Password must be at least 6 characters</p>
                                            </div>
                                        </div>

                                        {/* Location Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-semibold text-white/90 drop-shadow-sm">
                                                    Location (Optional)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleGetCurrentLocation}
                                                    disabled={isFetchingLocation}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                                        isFetchingLocation
                                                            ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                                            : 'bg-white/20 text-white hover:bg-white/30 border border-white/30 hover:border-white/50'
                                                    }`}
                                                >
                                                    {isFetchingLocation ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/60 border-t-white"></div>
                                                            <span>Getting Location...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Navigation className="h-3 w-3" />
                                                            <span>Use Current Location</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Address Field */}
                                            <div className="mb-3">
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                                                    <input
                                                        id="address"
                                                        name="address"
                                                        type="text"
                                                        value={formData.address}
                                                        onChange={handleInputChange}
                                                        className="pl-10 w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="Enter your address"
                                                    />
                                                </div>
                                            </div>

                                            {/* Latitude and Longitude Row */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="relative">
                                                    <input
                                                        id="latitude"
                                                        name="latitude"
                                                        type="number"
                                                        step="any"
                                                        value={formData.latitude || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="Latitude"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        id="longitude"
                                                        name="longitude"
                                                        type="number"
                                                        step="any"
                                                        value={formData.longitude || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg"
                                                        placeholder="Longitude"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-white/60 mt-1.5 drop-shadow-sm">
                                                Click "Use Current Location" or enter manually
                                            </p>
                                        </div>
                                        
                                        {/* Role Selection */}
                                        <div>
                                            <label className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                Select Your Role *
                                            </label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {/* Citizen Radio */}
                                                <label className={`relative flex flex-col items-center justify-center px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                    formData.role === 'citizen' 
                                                        ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                        : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="role"
                                                        value="citizen"
                                                        checked={formData.role === 'citizen'}
                                                        onChange={handleRoleChange}
                                                        className="sr-only"
                                                    />
                                                    <User className={`h-5 w-5 mb-1.5 ${
                                                        formData.role === 'citizen' ? 'text-white' : 'text-white/70'
                                                    }`} />
                                                    <span className={`text-sm font-medium ${
                                                        formData.role === 'citizen' ? 'text-white' : 'text-white/80'
                                                    }`}>
                                                        Citizen
                                                    </span>
                                                </label>

                                                {/* Officer Radio */}
                                                <label className={`relative flex flex-col items-center justify-center px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                    formData.role === 'officer' 
                                                        ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                        : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="role"
                                                        value="officer"
                                                        checked={formData.role === 'officer'}
                                                        onChange={handleRoleChange}
                                                        className="sr-only"
                                                    />
                                                    <Shield className={`h-5 w-5 mb-1.5 ${
                                                        formData.role === 'officer' ? 'text-white' : 'text-white/70'
                                                    }`} />
                                                    <span className={`text-sm font-medium ${
                                                        formData.role === 'officer' ? 'text-white' : 'text-white/80'
                                                    }`}>
                                                        Officer
                                                    </span>
                                                </label>

                                                {/* Admin Radio */}
                                                <label className={`relative flex flex-col items-center justify-center px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                    formData.role === 'admin' 
                                                        ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                        : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="role"
                                                        value="admin"
                                                        checked={formData.role === 'admin'}
                                                        onChange={handleRoleChange}
                                                        className="sr-only"
                                                    />
                                                    <Lock className={`h-5 w-5 mb-1.5 ${
                                                        formData.role === 'admin' ? 'text-white' : 'text-white/70'
                                                    }`} />
                                                    <span className={`text-sm font-medium ${
                                                        formData.role === 'admin' ? 'text-white' : 'text-white/80'
                                                    }`}>
                                                        Admin
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Category Selection - Only shown for officers */}
                                        {formData.role === 'officer' && (
                                            <div className="animate-fadeIn">
                                                <label className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Select Your Category *
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {/* Rail Category */}
                                                    <label className={`relative flex flex-col items-center justify-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                        formData.category === 'rail' 
                                                            ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                            : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="category"
                                                            value="rail"
                                                            checked={formData.category === 'rail'}
                                                            onChange={handleInputChange}
                                                            className="sr-only"
                                                        />
                                                        <Train className={`h-5 w-5 mb-1.5 ${
                                                            formData.category === 'rail' ? 'text-white' : 'text-white/70'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            formData.category === 'rail' ? 'text-white' : 'text-white/80'
                                                        }`}>
                                                            Rail
                                                        </span>
                                                    </label>

                                                    {/* Road Category */}
                                                    <label className={`relative flex flex-col items-center justify-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                        formData.category === 'road' 
                                                            ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                            : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="category"
                                                            value="road"
                                                            checked={formData.category === 'road'}
                                                            onChange={handleInputChange}
                                                            className="sr-only"
                                                        />
                                                        <Construction className={`h-5 w-5 mb-1.5 ${
                                                            formData.category === 'road' ? 'text-white' : 'text-white/70'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            formData.category === 'road' ? 'text-white' : 'text-white/80'
                                                        }`}>
                                                            Road
                                                        </span>
                                                    </label>

                                                    {/* Fire Category */}
                                                    <label className={`relative flex flex-col items-center justify-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                        formData.category === 'fire' 
                                                            ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                            : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="category"
                                                            value="fire"
                                                            checked={formData.category === 'fire'}
                                                            onChange={handleInputChange}
                                                            className="sr-only"
                                                        />
                                                        <Flame className={`h-5 w-5 mb-1.5 ${
                                                            formData.category === 'fire' ? 'text-white' : 'text-white/70'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            formData.category === 'fire' ? 'text-white' : 'text-white/80'
                                                        }`}>
                                                            Fire
                                                        </span>
                                                    </label>

                                                    {/* Cyber Category */}
                                                    <label className={`relative flex flex-col items-center justify-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                        formData.category === 'cyber' 
                                                            ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                            : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="category"
                                                            value="cyber"
                                                            checked={formData.category === 'cyber'}
                                                            onChange={handleInputChange}
                                                            className="sr-only"
                                                        />
                                                        <AlertTriangle className={`h-5 w-5 mb-1.5 ${
                                                            formData.category === 'cyber' ? 'text-white' : 'text-white/70'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            formData.category === 'cyber' ? 'text-white' : 'text-white/80'
                                                        }`}>
                                                            Cyber
                                                        </span>
                                                    </label>

                                                    {/* Police Category */}
                                                    <label className={`relative flex flex-col items-center justify-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                        formData.category === 'police' 
                                                            ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                            : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="category"
                                                            value="police"
                                                            checked={formData.category === 'police'}
                                                            onChange={handleInputChange}
                                                            className="sr-only"
                                                        />
                                                        <Shield className={`h-5 w-5 mb-1.5 ${
                                                            formData.category === 'police' ? 'text-white' : 'text-white/70'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            formData.category === 'police' ? 'text-white' : 'text-white/80'
                                                        }`}>
                                                            Police
                                                        </span>
                                                    </label>

                                                    {/* Court Category */}
                                                    <label className={`relative flex flex-col items-center justify-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                                        formData.category === 'court' 
                                                            ? 'bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg' 
                                                            : 'bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/25 hover:border-white/40'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="category"
                                                            value="court"
                                                            checked={formData.category === 'court'}
                                                            onChange={handleInputChange}
                                                            className="sr-only"
                                                        />
                                                        <Scale className={`h-5 w-5 mb-1.5 ${
                                                            formData.category === 'court' ? 'text-white' : 'text-white/70'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            formData.category === 'court' ? 'text-white' : 'text-white/80'
                                                        }`}>
                                                            Court
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Department Selection - Shown for officers (all departments initially, filtered by category when selected) */}
                                        {formData.role === 'officer' && (
                                            <div className="animate-fadeIn">
                                                <label className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Select Your Department *
                                                </label>
                                                
                                                {/* Loading State */}
                                                {(isDepartmentsLoading || (formData.category && categoryDepartmentsLoading)) ? (
                                                    <div className="w-full px-4 py-8 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl shadow-lg flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/60 border-t-white mr-3"></div>
                                                        <span className="text-white/80 text-sm">
                                                            {isDepartmentsLoading 
                                                                ? 'Loading departments...' 
                                                                : 'Loading category departments...'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Department List Box - Shows max 5 departments with scroll */}
                                                        <div style={{
                                                            width: '100%',
                                                            height: '300px',
                                                            background: 'rgba(255, 255, 255, 0.2)',
                                                            backdropFilter: 'blur(16px)',
                                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                                            borderRadius: '12px',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                            overflow: 'hidden'
                                                        }}>
                                                            <div className="custom-scrollbar" style={{
                                                                height: '100%',
                                                                overflowY: 'auto'
                                                            }}>
                                                                {/* Show category-filtered departments if category is selected, otherwise show all */}
                                                                {formData.category ? (
                                                                    // Category selected - show filtered departments
                                                                    departmentsByCategory[formData.category]?.length > 0 ? (
                                                                        departmentsByCategory[formData.category].map((dept, index) => (
                                                                            <div
                                                                                key={dept._id}
                                                                                onClick={() => handleDepartmentSelect(dept._id)}
                                                                                className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
                                                                                    formData.department_id === dept._id
                                                                                        ? 'bg-white/40 backdrop-blur-lg border-l-4 border-white shadow-md'
                                                                                        : 'bg-white/10 hover:bg-white/25 border-l-4 border-transparent'
                                                                                } ${index !== 0 ? 'border-t border-white/20' : ''}`}
                                                                            >
                                                                                <div className="flex items-center justify-between gap-4">
                                                                                    <div className="flex items-center gap-3 flex-1">
                                                                                        <Building2 className="h-4 w-4 text-white/70 flex-shrink-0" />
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-white font-medium text-sm drop-shadow-sm truncate">
                                                                                                {dept.name}
                                                                                            </p>
                                                                                            <p className="text-white/60 text-xs">
                                                                                                Level {dept.jurisdiction_level}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    {formData.department_id === dept._id && (
                                                                                        <div className="flex items-center justify-center w-5 h-5 bg-white/30 rounded-full flex-shrink-0">
                                                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                            </svg>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-4 py-8 text-center">
                                                                            <p className="text-white/60 text-sm">
                                                                                No departments available for {formData.category}
                                                                            </p>
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    // No category selected - show all departments
                                                                    allDepartments.length > 0 ? (
                                                                        allDepartments.map((dept, index) => (
                                                                            <div
                                                                                key={dept._id}
                                                                                onClick={() => handleDepartmentSelect(dept._id)}
                                                                                className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
                                                                                    formData.department_id === dept._id
                                                                                        ? 'bg-white/40 backdrop-blur-lg border-l-4 border-white shadow-md'
                                                                                        : 'bg-white/10 hover:bg-white/25 border-l-4 border-transparent'
                                                                                } ${index !== 0 ? 'border-t border-white/20' : ''}`}
                                                                            >
                                                                                <div className="flex items-center justify-between gap-4">
                                                                                    <div className="flex items-center gap-3 flex-1">
                                                                                        <Building2 className="h-4 w-4 text-white/70 flex-shrink-0" />
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-white font-medium text-sm drop-shadow-sm truncate">
                                                                                                {dept.name}
                                                                                            </p>
                                                                                            <p className="text-white/60 text-xs">
                                                                                                {dept.category} • Level {dept.jurisdiction_level}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    {formData.department_id === dept._id && (
                                                                                        <div className="flex items-center justify-center w-5 h-5 bg-white/30 rounded-full flex-shrink-0">
                                                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                            </svg>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-4 py-8 text-center">
                                                                            <p className="text-white/60 text-sm">
                                                                                No departments available
                                                                            </p>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Department count info */}
                                                        {formData.category ? (
                                                            departmentsByCategory[formData.category]?.length > 0 && (
                                                                <p className="text-xs text-white/60 mt-2 drop-shadow-sm">
                                                                    {departmentsByCategory[formData.category].length} {formData.category} department(s) available
                                                                </p>
                                                            )
                                                        ) : (
                                                            allDepartments.length > 0 && (
                                                                <p className="text-xs text-white/60 mt-2 drop-shadow-sm">
                                                                    {allDepartments.length} total department(s) available
                                                                </p>
                                                            )
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Department Secret Field - Only shown for officers after department selection */}
                                        {formData.role === 'officer' && formData.department_id && (
                                            <div className="animate-fadeIn">
                                                <label htmlFor="department_secret" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow-sm">
                                                    Department Secret *
                                                </label>
                                                <div className="flex gap-3">
                                                    <div className="relative flex-1">
                                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                                                        <input
                                                            id="department_secret"
                                                            name="department_secret"
                                                            type={showDepartmentSecret ? "text" : "password"}
                                                            required
                                                            value={formData.department_secret}
                                                            onChange={handleInputChange}
                                                            disabled={isSecretVerified}
                                                            className={`pl-10 pr-12 w-full px-3 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 transition-all duration-300 text-sm text-white placeholder-white/60 shadow-lg ${
                                                                isSecretVerified ? 'opacity-70 cursor-not-allowed' : ''
                                                            }`}
                                                            placeholder="Enter department secret"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowDepartmentSecret(!showDepartmentSecret)}
                                                            disabled={isSecretVerified}
                                                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 rounded-lg border border-white/20 backdrop-blur-sm transition-colors duration-200 no-hover-transform ${
                                                                isSecretVerified ? 'opacity-50 cursor-not-allowed' : ''
                                                            }`}
                                                        >
                                                            {showDepartmentSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    
                                                    <button
                                                        type="button"
                                                        onClick={handleVerifySecret}
                                                        disabled={isVerifyingSecret || isSecretVerified || !formData.department_secret}
                                                        className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg flex items-center gap-2 whitespace-nowrap ${
                                                            isSecretVerified
                                                                ? 'bg-green-500/30 border-2 border-green-400/60 text-green-100 cursor-not-allowed'
                                                                : isVerifyingSecret || !formData.department_secret
                                                                ? 'bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed'
                                                                : 'bg-blue-500/30 border-2 border-blue-400/60 text-white hover:bg-blue-500/40 hover:border-blue-400/80 hover:shadow-xl transform hover:scale-105'
                                                        }`}
                                                    >
                                                        {isVerifyingSecret ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/60 border-t-white"></div>
                                                                <span>Verifying...</span>
                                                            </>
                                                        ) : isSecretVerified ? (
                                                            <>
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                <span>Verified</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield className="h-4 w-4" />
                                                                <span>Verify</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-white/60 mt-1.5 drop-shadow-sm">
                                                    Enter your department's secret code to verify authorization
                                                </p>
                                            </div>
                                        )}

                                        {/* Glass Submit Button */}
                                        <div className="pt-6">
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className={`group relative w-full py-4 px-6 bg-gradient-to-r from-blue-600/70 via-indigo-600/70 to-purple-600/70 backdrop-blur-xl text-white font-bold text-base rounded-xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition-all duration-500 transform hover:scale-[1.03] active:scale-[0.97] border-2 border-blue-400/60 hover:border-blue-300/80 overflow-hidden ${
                                                    isLoading ? 'opacity-70 cursor-not-allowed hover:scale-100 active:scale-100' : 'hover:from-blue-700/80 hover:via-indigo-700/80 hover:to-purple-700/80'
                                                }`}
                                            >
                                                {/* Pulsing background animation */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-purple-500/40 animate-pulse opacity-50"></div>
                                                
                                                {/* Animated background glow */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-indigo-400/30 to-purple-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm animate-pulse"></div>
                                                
                                                {/* Shimmer effect - enhanced */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                                                
                                                {/* Ripple effect on hover */}
                                                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300">
                                                    <div className="absolute inset-0 bg-white/20 rounded-xl animate-ping"></div>
                                                </div>
                                                
                                                <div className="relative z-10">
                                                    {isLoading ? (
                                                        <div className="flex items-center justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/60 border-t-white mr-3 shadow-lg"></div>
                                                            <span className="text-sm sm:text-base animate-pulse">Creating Your Account...</span>
                                                        </div>
                                                    ) : (
                                                        <span className="flex items-center justify-center drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300">
                                                            <span className="text-sm sm:text-base font-bold group-hover:text-blue-100 transition-colors duration-300">Create My Account</span>
                                                            <User className="ml-2 h-5 w-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </div>

                                        {/* Glass Terms */}
                                        <div className="pt-2">
                                            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/10">
                                                <p className="text-xs text-white/70 text-center drop-shadow-sm">
                                                    By creating an account, you agree to our{' '}
                                                    <a href="#" className="text-white/90 hover:text-white font-medium underline decoration-white/50 hover:decoration-white transition-all">Terms of Service</a>
                                                    {' '}and{' '}
                                                    <a href="#" className="text-white/90 hover:text-white font-medium underline decoration-white/50 hover:decoration-white transition-all">Privacy Policy</a>
                                                </p>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                {/* Glass Footer */}
                                <div className="mt-6">
                                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl text-center">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/30"></div>
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-4 bg-white/10 backdrop-blur-sm text-white/80 rounded-lg border border-white/20 drop-shadow-sm">Already have an account?</span>
                                            </div>
                                        </div>
                                        <a 
                                            href="/login" 
                                            className="inline-block bg-white/20 backdrop-blur-lg text-white font-semibold text-sm px-6 py-2 rounded-xl border border-white/30 hover:bg-white/30 hover:border-white/40 transition-all duration-300 shadow-lg drop-shadow-sm"
                                        >
                                            Login here →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}