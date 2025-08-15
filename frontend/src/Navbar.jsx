import React, { useState, useEffect } from "react";
import "./Navbar.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { logout } from "./auth/redux/authSlice";

export default function Navbar() {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogin = () => {
        navigate('/login');
    };

    const handleSignup = () => {
        navigate('/signup');
        console.log('Signup clicked');
    };

    const handleSignOut = () => {
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        dispatch(logout());
        console.log('Sign out clicked');
    };

    const handleProfileClick = () => {
        navigate("/user");
        console.log('Profile clicked');
    };

    const navLinks = [
        { name: 'Home', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { name: 'Trending', href: '#trending', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { name: 'Help', href: '#help', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { name: 'Authority', href: '#authority', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
    ];

    // Add Complain link only for authenticated users
    const displayNavLinks = isAuthenticated ? [
        navLinks[0], // Home
        { name: 'Complaint', href: '/complain', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ...navLinks.slice(1) // Trending, Help, Authority
    ] : navLinks;

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
                    {displayNavLinks.map((link, index) => (
                        link.href.startsWith('#') ? (
                            <a
                                key={link.name}
                                href={link.href}
                                className="navbar-link"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <svg className="navbar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                                </svg>
                                <span className="navbar-link-text">{link.name}</span>
                                <div className="navbar-link-hover-effect"></div>
                            </a>
                        ) : (
                            <Link
                                key={link.name}
                                to={link.href}
                                className="navbar-link"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <svg className="navbar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                                </svg>
                                <span className="navbar-link-text">{link.name}</span>
                                <div className="navbar-link-hover-effect"></div>
                            </Link>
                        )
                    ))}
                </div>

                {/* Authentication & Profile Section */}
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
                            >
                                <svg className="auth-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </button>
                        </>
                    )}
                    
                    {/* Profile Button - Always visible when logged in */}
                    {isAuthenticated && (
                        <button 
                            className="profile-btn"
                            onClick={handleProfileClick}
                            title={`${user?.name || 'Unknown'}'s Profile`}
                        >
                            <img 
                                src={user?.profileImage || 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png'} 
                                alt={user?.name || 'Unknown'}
                                className="profile-avatar"
                            />
                            <div className="profile-status-indicator"></div>
                        </button>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <div className="mobile-menu-button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
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
                        link.href.startsWith('#') ? (
                            <a
                                key={link.name}
                                href={link.href}
                                className="mobile-menu-link"
                                style={{ animationDelay: `${index * 0.1}s` }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <svg className="mobile-menu-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                                </svg>
                                <span className="mobile-menu-link-text">{link.name}</span>
                            </a>
                        ) : (
                            <Link
                                key={link.name}
                                to={link.href}
                                className="mobile-menu-link"
                                style={{ animationDelay: `${index * 0.1}s` }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <svg className="mobile-menu-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                                </svg>
                                <span className="mobile-menu-link-text">{link.name}</span>
                            </Link>
                        )
                    ))}
                </div>
            </div>
        </nav>
    );
}
