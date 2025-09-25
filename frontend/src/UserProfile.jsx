import React, { useState, useEffect, useRef } from "react";
import "./UserProfile.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadUser } from "./auth/redux/authSlice";
import { ArrowLeft } from "lucide-react";
import UserProfileSidebar from './UserProfileSidebar';
import UserProfileContent from './UserProfileContent';

function UserProfile() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeSection, setActiveSection] = useState(() => {
        return searchParams.get('tab') || 'profile';
    });
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
    const hasLoadedUser = useRef(false);
    
    // Handle tab changes and update URL
    const handleSectionChange = (section) => {
        setActiveSection(section);
        setSearchParams({ tab: section });
    };
    
    // Load user data when component mounts - runs only once
    useEffect(() => {
        console.log("UserProfile mounted. Auth state:", { isAuthenticated, loading, hasToken: !!localStorage.getItem("token") });
        
        if (!hasLoadedUser.current && localStorage.getItem("token") && !user) {
            console.log("Loading user data...");
            dispatch(loadUser());
            hasLoadedUser.current = true;
        }
    }, []); // Empty dependency array - run only once on mount

    // Handle authentication redirects
    useEffect(() => {
        console.log("Auth effect triggered:", { isAuthenticated, loading });
        
        if (!loading && !isAuthenticated && !localStorage.getItem("token")) {
            console.log("Not authenticated, redirecting to home...");
            navigate('/');
        }
    }, [isAuthenticated, loading, navigate]);

    // Cleanup function
    useEffect(() => {
        return () => {
            console.log("UserProfile component unmounting");
        };
    }, []);
    
    const handleBackToHome = () => {
        navigate('/');
    };
    
    // Show loading state only during initial load (no user data and specific loading condition)
    if (!user && loading && !hasLoadedUser.current && localStorage.getItem("token")) {
        return (
            <div className="user-profile-container">
                <div className="profile-background">
                    <div className="profile-bg-element"></div>
                    <div className="profile-bg-element"></div>
                    <div className="profile-bg-element"></div>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your profile...</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated and no loading
    if (!isAuthenticated && !loading && !localStorage.getItem("token")) {
        return null; // Will redirect via useEffect
    }

    return (
        <div className="user-profile-container">
            {/* Background Elements */}
            <div className="profile-background">
                <div className="profile-bg-element"></div>
                <div className="profile-bg-element"></div>
                <div className="profile-bg-element"></div>
            </div>
            
            {/* Sidebar */}
            <UserProfileSidebar 
                activeSection={activeSection}
                setActiveSection={handleSectionChange}
                onBackToHome={handleBackToHome}
            />
            
            {/* Main Content */}
            <div className="profile-main">
                {/* Back Button */}
                <div className="back-button-container">
                    <button onClick={handleBackToHome} className="back-btn">
                        <ArrowLeft className="back-icon" />
                    </button>
                </div>
                
                {/* Content */}
                <UserProfileContent activeSection={activeSection} />
            </div>
        </div>
    );
}

export default UserProfile

