import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./UserProfile.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { loadUser } from "./auth/redux/authSlice";
import { ArrowLeft } from "lucide-react";
import Navbar from './Navbar';
import UserProfileSidebar from './UserProfileSidebar';
import UserProfileContent from './UserProfileContent';

function UserProfile() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeSection, setActiveSection] = useState(() => {
        return searchParams.get('tab') || 'profile';
    });
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
    const hasLoadedUser = useRef(false);
    const contentRef = useRef(null);
    
    // Check if we're actually on the user profile route
    // If the pathname is not '/user', we shouldn't render this component
    useEffect(() => {
        if (location.pathname !== '/user') {
            // console.log("Not on /user route, pathname is:", location.pathname);
            // Component will unmount naturally as router switches to the correct route
        }
    }, [location.pathname]);
    
    // Handle tab changes and update URL - memoized to prevent re-creation
    const handleSectionChange = useCallback((section) => {
        // console.log("Section change requested:", section);
        if (section !== activeSection) {
            setActiveSection(section);
            setSearchParams({ tab: section });
            
            // Reset scroll position when changing sections
            setTimeout(() => {
                // Reset content container scroll using ref
                if (contentRef.current) {
                    contentRef.current.scrollTop = 0;
                }
                
                // Also try querySelector as fallback
                const contentContainer = document.querySelector('.content-container');
                if (contentContainer) {
                    contentContainer.scrollTop = 0;
                }
                
                // Reset main profile content area scroll
                const profileMain = document.querySelector('.profile-main');
                if (profileMain) {
                    profileMain.scrollTop = 0;
                }
                
                // Reset window scroll as well
                window.scrollTo(0, 0);
            }, 50); // Small delay to ensure DOM has updated
        }
    }, [activeSection, setSearchParams]);
    
    // Load user data when component mounts - runs only once
    useEffect(() => {
        // console.log("UserProfile mounted. Auth state:", { isAuthenticated, loading, hasToken: !!localStorage.getItem("token") });
        
        if (!hasLoadedUser.current && localStorage.getItem("token") && !user) {
            // console.log("Loading user data...");
            dispatch(loadUser());
            hasLoadedUser.current = true;
        }
    }, []); // Empty dependency array - run only once on mount

    // Listen for URL parameter changes and update activeSection accordingly
    useEffect(() => {
        const currentTab = searchParams.get('tab') || 'profile';
        if (currentTab !== activeSection) {
            // console.log("URL tab changed, updating activeSection:", currentTab);
            setActiveSection(currentTab);
        }
    }, [searchParams]); // Listen to searchParams changes

    // Handle authentication redirects
    useEffect(() => {
        // console.log("Auth effect triggered:", { isAuthenticated, loading });
        
        if (!loading && !isAuthenticated && !localStorage.getItem("token")) {
            // console.log("Not authenticated, redirecting to home...");
            navigate('/');
        }
    }, [isAuthenticated, loading, navigate]);

    // Cleanup function
    useEffect(() => {
        return () => {
            // console.log("UserProfile component unmounting");
        };
    }, []);
    
    const handleBackToHome = useCallback(() => {
        // console.log("Back button clicked. Auth state:", { isAuthenticated, hasToken: !!localStorage.getItem("token") });
        
        // Try to go back to previous page first, fallback to home routes
        if (window.history.length > 1) {
            navigate(-1); // Go back to previous page
        } else {
            // For authenticated users, navigate to a main app page instead of landing page
            if (isAuthenticated && localStorage.getItem("token")) {
                navigate('/home'); // or '/dashboard' - wherever your main app content is
            } else {
                navigate('/');
            }
        }
    }, [isAuthenticated, navigate]);
    
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

    // Memoize navbar to prevent re-renders
    const navbarComponent = useMemo(() => <Navbar />, []);

    return (
        <div className="user-profile-container">
            {/* Navbar */}
            {navbarComponent}
            
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
                <UserProfileContent 
                    activeSection={activeSection} 
                    contentRef={contentRef}
                />
            </div>
        </div>
    );
}

export default UserProfile

