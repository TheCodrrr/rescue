import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "./Navbar.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { logout } from "./auth/redux/authSlice";
import CloudImage from "./utils/CloudImage";

// Navigation links component using React Router Link
const NavLinks = ({ links, currentPath }) => {
    return (
        <>
            {links.map((link, index) => (
                <Link
                    key={link.name}
                    to={link.href}
                    className={`navbar-link ${currentPath === link.href ? 'navbar-link-active' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <svg className="navbar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                    </svg>
                    <span className="navbar-link-text">{link.name}</span>
                    <div className="navbar-link-hover-effect"></div>
                </Link>
            ))}
        </>
    );
};

NavLinks.displayName = 'NavLinks';

// Memoized auth buttons component
const AuthButtons = React.memo(({ isAuthenticated, handleLogin, handleSignup, handleSignOut, handleProfileClick, userProfileImage, userName }) => {
    return (
        <div className="navbar-auth">
            {!isAuthenticated ? (
                <>
                    <button 
                        className="auth-btn login-btn"
                        onClick={handleLogin}
                    >
                        <svg className="auth-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Login
                    </button>
                    <button 
                        className="auth-btn signup-btn"
                        onClick={handleSignup}
                    >
                        <svg className="auth-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Sign Up
                    </button>
                </>
            ) : (
                <>
                    <button 
                        className="auth-btn signout-btn"
                        onClick={handleSignOut}
                        title="Sign Out"
                    >
                        <svg className="auth-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                    <button 
                        className="profile-btn"
                        onClick={handleProfileClick}
                        title={`${userName || 'Unknown'}'s Profile`}
                    >
                        <CloudImage
                            src={userProfileImage || "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png"}
                            alt={userName || "Unknown"}
                            className="profile-avatar"
                        />
                        <div className="profile-status-indicator"></div>
                    </button>
                </>
            )}
        </div>
    );
});

AuthButtons.displayName = 'AuthButtons';

const Navbar = () => {
    // Use more specific selectors to prevent unnecessary re-renders
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const userProfileImage = useSelector((state) => state.auth.user?.profileImage);
    const userName = useSelector((state) => state.auth.user?.name);
    const userRole = useSelector((state) => state.auth.user?.role || 'citizen');
    
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogin = useCallback(() => {
        navigate('/login');
    }, [navigate]);

    const handleSignup = useCallback(() => {
        navigate('/signup');
        // console.log('Signup clicked');
    }, [navigate]);

    const handleSignOut = useCallback(() => {
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        dispatch(logout());
        // console.log('Sign out clicked');
    }, [dispatch]);

    const handleProfileClick = useCallback(() => {
        navigate("/user");
        // console.log('Profile clicked');
    }, [navigate]);

    const toggleMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(prev => !prev);
    }, []);

    const closeMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);

    // Common navigation links accessible to both roles
    const commonNavLinks = useMemo(() => [
        { name: 'Home', href: '/home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { name: 'Trending', href: '/trending', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { name: 'Help', href: '/help', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ], []);

    // Citizen-specific navigation links
    const citizenSpecificLinks = useMemo(() => [
        // { name: 'Authority', href: '#authority', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
    ], []);

    // Officer-specific navigation links
    const officerSpecificLinks = useMemo(() => [
        { name: 'Complaints', href: '/complain', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { name: 'Department', href: '/officer/department', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        // { name: 'Queue', href: '/officer/queue', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
        // { name: 'Escalations', href: '/officer/escalations', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        // { name: 'Analytics', href: '/officer/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { name: 'Teams', href: '/officer/teams', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    ], []);

    // Build navigation links based on user role
    const displayNavLinks = useMemo(() => {
        if (userRole === 'officer') {
            // Officer gets: Home + officer-specific links (Complaints, Queue, Escalations, Analytics, Teams)
            return [commonNavLinks[0], ...officerSpecificLinks]; // commonNavLinks[0] is Home
        }
        
        // Citizen gets: Common links + Complaint (if authenticated) + citizen-specific links
        let links = [...commonNavLinks];
        
        if (isAuthenticated) {
            links.splice(1, 0, { 
                name: 'Complaint', 
                href: '/complain', 
                icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' 
            });
        }
        
        links = [...links, ...citizenSpecificLinks];
        
        return links;
    }, [isAuthenticated, userRole, commonNavLinks, citizenSpecificLinks, officerSpecificLinks]);

    return (
        <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
            <div className="navbar-container">
                {/* Logo */}
                <div className="navbar-brand">
                    <div className="lodge-logo">
                        <svg className="lodge-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="lodge-text">Rescue</span>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div className="navbar-menu ml-3">
                    <NavLinks links={displayNavLinks} currentPath={location.pathname} />
                </div>

                {/* Authentication & Profile Section */}
                <AuthButtons
                    isAuthenticated={isAuthenticated}
                    handleLogin={handleLogin}
                    handleSignup={handleSignup}
                    handleSignOut={handleSignOut}
                    handleProfileClick={handleProfileClick}
                    userProfileImage={userProfileImage}
                    userName={userName}
                />

                {/* Mobile Menu Button */}
                <div className="mobile-menu-button" onClick={toggleMobileMenu}>
                    <div className={`hamburger ${isMobileMenuOpen ? 'hamburger-active' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-active' : ''}`}>
                <div className="mobile-menu-content">
                    {displayNavLinks.map((link, index) => (
                        <Link
                            key={link.name}
                            to={link.href}
                            className={`mobile-menu-link ${location.pathname === link.href ? 'mobile-menu-link-active' : ''}`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                            onClick={closeMobileMenu}
                        >
                            <svg className="mobile-menu-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                            </svg>
                            <span className="mobile-menu-link-text">{link.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
};

Navbar.displayName = 'Navbar';

export default Navbar;
