import React from "react";
import { Home, ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
    const handleGoHome = () => {
        window.location.href = '/';
    };

    const handleGoBack = () => {
        window.history.back();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-32 right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
                
                {/* Multiple Floating Elements Scattered */}
                <div className="absolute w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 animate-float" style={{top: '15%', left: '20%'}}></div>
                <div className="absolute w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl border border-white/25 animate-float" style={{top: '65%', left: '70%', animationDelay: '1s'}}></div>
                <div className="absolute w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 animate-float" style={{top: '45%', left: '85%', animationDelay: '2s'}}></div>
                <div className="absolute w-20 h-20 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/15 animate-float" style={{top: '80%', left: '15%', animationDelay: '3s'}}></div>
                <div className="absolute w-10 h-10 bg-white/12 backdrop-blur-sm rounded-xl border border-white/25 animate-float" style={{top: '25%', left: '65%', animationDelay: '0.5s'}}></div>
                <div className="absolute w-14 h-14 bg-white/8 backdrop-blur-sm rounded-2xl border border-white/20 animate-float" style={{top: '75%', left: '35%', animationDelay: '1.5s'}}></div>
                <div className="absolute w-6 h-6 bg-white/18 backdrop-blur-sm rounded-lg border border-white/35 animate-float" style={{top: '35%', left: '25%', animationDelay: '2.5s'}}></div>
                <div className="absolute w-18 h-18 bg-white/7 backdrop-blur-sm rounded-2xl border border-white/18 animate-float" style={{top: '85%', left: '75%', animationDelay: '3.5s'}}></div>
                <div className="absolute w-8 h-8 bg-white/15 backdrop-blur-sm rounded-xl border border-white/28 animate-float" style={{top: '55%', left: '45%', animationDelay: '4s'}}></div>
                <div className="absolute w-12 h-12 bg-white/9 backdrop-blur-sm rounded-2xl border border-white/22 animate-float" style={{top: '20%', left: '80%', animationDelay: '4.5s'}}></div>
                <div className="absolute w-16 h-16 bg-white/6 backdrop-blur-sm rounded-3xl border border-white/16 animate-float" style={{top: '70%', left: '55%', animationDelay: '5s'}}></div>
                <div className="absolute w-10 h-10 bg-white/13 backdrop-blur-sm rounded-xl border border-white/26 animate-float" style={{top: '40%', left: '30%', animationDelay: '5.5s'}}></div>
                <div className="absolute w-14 h-14 bg-white/11 backdrop-blur-sm rounded-2xl border border-white/24 animate-float" style={{top: '10%', left: '50%', animationDelay: '6s'}}></div>
                <div className="absolute w-6 h-6 bg-white/17 backdrop-blur-sm rounded-lg border border-white/32 animate-float" style={{top: '90%', left: '40%', animationDelay: '0.2s'}}></div>
                <div className="absolute w-8 h-8 bg-white/14 backdrop-blur-sm rounded-xl border border-white/27 animate-float" style={{top: '30%', left: '75%', animationDelay: '1.2s'}}></div>
                <div className="absolute w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/23 animate-float" style={{top: '60%', left: '25%', animationDelay: '2.2s'}}></div>
                <div className="absolute w-10 h-10 bg-white/16 backdrop-blur-sm rounded-xl border border-white/29 animate-float" style={{top: '50%', left: '15%', animationDelay: '3.2s'}}></div>
                <div className="absolute w-8 h-8 bg-white/12 backdrop-blur-sm rounded-lg border border-white/26 animate-float" style={{top: '15%', left: '40%', animationDelay: '4.2s'}}></div>
                <div className="absolute w-14 h-14 bg-white/8 backdrop-blur-sm rounded-2xl border border-white/21 animate-float" style={{top: '75%', left: '60%', animationDelay: '5.2s'}}></div>
                <div className="absolute w-6 h-6 bg-white/19 backdrop-blur-sm rounded-lg border border-white/34 animate-float" style={{top: '25%', left: '85%', animationDelay: '6.2s'}}></div>
                <div className="absolute w-12 h-12 bg-white/11 backdrop-blur-sm rounded-xl border border-white/25 animate-float" style={{top: '5%', left: '10%', animationDelay: '7s'}}></div>
                <div className="absolute w-16 h-16 bg-white/9 backdrop-blur-sm rounded-2xl border border-white/20 animate-float" style={{top: '95%', left: '90%', animationDelay: '7.5s'}}></div>
                <div className="absolute w-10 h-10 bg-white/13 backdrop-blur-sm rounded-xl border border-white/28 animate-float" style={{top: '42%', left: '92%', animationDelay: '8s'}}></div>
                <div className="absolute w-8 h-8 bg-white/15 backdrop-blur-sm rounded-lg border border-white/30 animate-float" style={{top: '88%', left: '8%', animationDelay: '8.5s'}}></div>
            </div>

            <div className="max-w-2xl w-full relative z-10 text-center">
                {/* Main Glass Container */}
                <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-6 md:p-8 relative overflow-hidden">
                    {/* Animated Sparkles */}
                    <div className="absolute top-4 left-4 w-2 h-2 bg-white/60 rounded-full animate-ping"></div>
                    <div className="absolute top-8 right-6 w-1 h-1 bg-blue-300/80 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                    <div className="absolute bottom-6 left-8 w-3 h-3 bg-purple-300/60 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>

                    {/* 404 Number with Animation */}
                    <div className="relative mb-6">
                        <div className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-purple-200 drop-shadow-2xl animate-bounce-slow">
                            <span className="relative inline-block animate-shake">4</span>
                            <span className="relative inline-block animate-wiggle" style={{animationDelay: '0.5s'}}>0</span>
                            <span className="relative inline-block animate-shake" style={{animationDelay: '1s'}}>4</span>
                        </div>
                        
                        {/* Glowing Effect Behind 404 */}
                        <div className="absolute inset-0 text-8xl md:text-9xl font-black text-white/20 blur-2xl animate-pulse">
                            404
                        </div>
                    </div>

                    {/* Error Icon with Animation */}
                    <div className="flex justify-center mb-4">
                        <div className="relative group">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border-2 border-white/30 shadow-2xl animate-bob">
                                <AlertCircle className="h-8 w-8 text-white/90 drop-shadow-lg" />
                            </div>
                            
                            {/* Pulsing Ring */}
                            <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-ping"></div>
                        </div>
                    </div>

                    {/* Main Message */}
                    <div className="mb-8 space-y-3">
                        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg animate-fade-in-up">
                            Oops! Page Not Found
                        </h1>
                        <p className="text-base md:text-lg text-white/80 drop-shadow-md max-w-lg mx-auto animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                            The page you're looking for doesn't exist. Let's get you back on track!
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                        {/* Go Home Button */}
                        <button
                            onClick={handleGoHome}
                            className="group relative px-6 py-3 bg-gradient-to-r from-blue-600/70 via-indigo-600/70 to-purple-600/70 backdrop-blur-xl text-white font-bold text-sm rounded-xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition-all duration-500 transform hover:scale-105 active:scale-95 border-2 border-blue-400/60 hover:border-blue-300/80 overflow-hidden hover:from-blue-700/80 hover:via-indigo-700/80 hover:to-purple-700/80"
                        >
                            {/* Pulsing background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-purple-500/40 animate-pulse opacity-50"></div>
                            
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                            
                            {/* Ripple effect */}
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300">
                                <div className="absolute inset-0 bg-white/20 rounded-xl animate-ping"></div>
                            </div>
                            
                            <span className="relative z-10 flex items-center justify-center drop-shadow-lg">
                                <Home className="mr-2 h-4 w-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                                <span className="group-hover:text-blue-100 ml-2 transition-colors duration-300">Go Home</span>
                            </span>
                        </button>

                        {/* Go Back Button */}
                        <button
                            onClick={handleGoBack}
                            className="group relative px-6 py-3 bg-white/20 backdrop-blur-xl text-white font-semibold text-sm rounded-xl border-2 border-white/30 hover:border-white/50 hover:bg-white/30 transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl overflow-hidden"
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                            
                            <span className="relative z-10 flex items-center justify-center drop-shadow-md">
                                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-300" />
                                <span className="group-hover:text-white/90 ml-2 transition-colors duration-300">Go Back</span>
                            </span>
                        </button>
                    </div>

                    {/* Simple Quote */}
                    <div className="mt-6 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 shadow-xl max-w-md mx-auto">
                            <p className="text-white/90 text-sm italic font-light drop-shadow-md">
                                "Every wrong turn is just a step closer to the right path."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}