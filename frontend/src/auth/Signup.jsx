import React, { useState } from "react";
import { Eye, EyeOff, Upload, User, Mail, Phone, Lock, Camera, X } from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginSuccess } from "./redux/authSlice";
import axiosInstance from "../api/axios.js";
import toast, { Toaster } from "react-hot-toast";

export default function Signup() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        profileImage: null
    });
    const [sendData, setSendData] = useState({
        email: "",
        password: "",
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.name || !formData.email || !formData.password || !formData.phone) {
            toast.error('Please fill in all required fields');
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
            // Create FormData for multipart/form-data
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('password', formData.password);
            formDataToSend.append('phone', formData.phone);
            
            if (formData.profileImage) {
                formDataToSend.append('profileImage', formData.profileImage);
            }

            const response = await axiosInstance.post('/users/register', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log("Signup response = ", response);
            toast.success('Account created successfully!');
            console.log('Signup successful:', response.data);

            // After successful signup, try to log the user in automatically
            try {
                const loginData = {
                    email: formData.email,
                    password: formData.password
                };
                
                const loginResponse = await axiosInstance.post('/users/login', loginData);
                
                if (loginResponse.status === 200) {
                    if (loginResponse.data.data && loginResponse.data.data.accessToken) {
                        // Store token in localStorage
                        localStorage.setItem('token', loginResponse.data.data.accessToken);
                        localStorage.setItem('isLoggedIn', 'true');
                        
                        // Update Redux state
                        dispatch(loginSuccess({
                            user: loginResponse.data.data.user,
                            token: loginResponse.data.data.accessToken
                        }));

                        toast.success('Login successful! Redirecting...');
                        
                        // Reset form
                        setFormData({
                            name: "",
                            email: "",
                            password: "",
                            phone: "",
                            profileImage: null
                        });
                        setImagePreview(null);
                        
                        // Navigate to home after a brief delay
                        setTimeout(() => {
                            navigate("/");
                        }, 1500);
                    } else {
                        // Registration successful but auto-login failed
                        toast.success('Account created! Please login to continue.');
                        setTimeout(() => {
                            navigate("/login");
                        }, 2000);
                    }
                } else {
                    // Registration successful but auto-login failed
                    toast.success('Account created! Please login to continue.');
                    setTimeout(() => {
                        navigate("/login");
                    }, 2000);
                }
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
            
            if (error.response?.data?.message) {
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
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs text-white/70 drop-shadow-sm">Password must be at least 6 characters</p>

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