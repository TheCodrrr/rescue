import React, { useState } from "react";
import { Eye, EyeOff, User, Mail, Lock, LogIn } from "lucide-react";
import axiosInstance from "../api/axios";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.email || !formData.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axiosInstance.post('/auth/login', formData);

            toast.success('Login successful!');
            console.log('Login successful:', response.data);
            
            // Reset form
            setFormData({
                email: "",
                password: ""
            });
            
        } catch (error) {
            console.error('Login error:', error);
            
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error.response?.status === 401) {
                toast.error('Invalid email or password.');
            } else if (error.response?.status === 404) {
                toast.error('User not found. Please check your email.');
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
            
            <div className="max-w-4xl w-full relative z-10">
                {/* Main Glass Container */}
                <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                    <div className="grid lg:grid-cols-5 min-h-[600px]">
                        
                        {/* Left Side - Welcome Section (2 columns) */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl p-6 flex flex-col items-center justify-center relative border-r border-white/10">
                            {/* Floating Glass Elements */}
                            <div className="absolute top-8 left-8 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 animate-float"></div>
                            <div className="absolute bottom-16 right-8 w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl border border-white/25 animate-float" style={{animationDelay: '1s'}}></div>
                            <div className="absolute top-1/3 right-4 w-8 h-8 bg-white/25 backdrop-blur-sm rounded-lg border border-white/35 animate-float" style={{animationDelay: '2s'}}></div>

                            <div className="relative z-10 text-center mb-6">
                                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Welcome Back!</h2>
                                <p className="text-white/80 text-sm drop-shadow-md">Login to your Lodge account</p>
                            </div>
                            
                            {/* Welcome Icon Section */}
                            <div className="relative z-10 flex flex-col items-center space-y-4">
                                <div className="relative group">
                                    {/* Glass Icon Container */}
                                    <div className="w-36 h-36 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border-2 border-white/30 group-hover:border-white/50 group-hover:bg-white/25 transition-all duration-500 shadow-2xl">
                                        <LogIn className="h-16 w-16 text-white/90 drop-shadow-lg" />
                                    </div>
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
                                    <p className="text-white/90 text-sm italic font-light drop-shadow-md">"Welcome back to Lodge"</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Login Form (3 columns) */}
                        <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white/5 backdrop-blur-lg">
                            <div className="w-full max-w-lg">
                                {/* Glass Header */}
                                <div className="mb-6 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl">
                                    <div className="flex items-center mb-3">
                                        <div className="h-12 w-12 bg-gradient-to-r from-white/30 to-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center mr-4 shadow-lg border border-white/30">
                                            <User className="h-6 w-6 text-white drop-shadow-sm" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">Login</h3>
                                            <p className="text-white/80 text-sm drop-shadow-md">Enter your credentials to continue</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Glass Form Container */}
                                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Email Field */}
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

                                        {/* Password Field */}
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

                                        {/* Remember Me & Forgot Password */}
                                        <div className="flex items-center justify-between pt-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 bg-white/20 border border-white/30 rounded focus:ring-white/50 focus:ring-2"
                                                />
                                                <span className="ml-2 text-sm text-white/80">Remember me</span>
                                            </label>
                                            <a 
                                                href="#" 
                                                className="text-sm ml-2 text-white/80 hover:text-white underline decoration-white/50 hover:decoration-white transition-all duration-200"
                                            >
                                                Forgot password?
                                            </a>
                                        </div>

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
                                                            <span className="text-sm sm:text-base animate-pulse">Logging you in...</span>
                                                        </div>
                                                    ) : (
                                                        <span className="flex items-center justify-center drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300">
                                                            <span className="text-sm sm:text-base font-bold group-hover:text-blue-100 transition-colors duration-300">Login</span>
                                                            <LogIn className="ml-2 h-5 w-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
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
                                                <span className="px-4 bg-white/10 backdrop-blur-sm text-white/80 rounded-lg border border-white/20 drop-shadow-sm">Don't have an account?</span>
                                            </div>
                                        </div>
                                        <a 
                                            href="/signup" 
                                            className="inline-block bg-white/20 backdrop-blur-lg text-white font-semibold text-sm px-6 py-2 rounded-xl border border-white/30 hover:bg-white/30 hover:border-white/40 transition-all duration-300 shadow-lg drop-shadow-sm"
                                        >
                                            Create account →
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
