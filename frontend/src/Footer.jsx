import React from "react";
import "./Footer.css";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const quickLinks = [
        { name: 'Emergency Report', href: '/report' },
        { name: 'Live Incidents', href: '/#map' },
        { name: 'Help Center', href: '/help' },
        { name: 'Authority Portal', href: '/authority' }
    ];

    const legalLinks = [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Data Protection', href: '/data-protection' },
        { name: 'Accessibility', href: '/accessibility' }
    ];

    const emergencyServices = [
        { name: 'Fire Department', phone: '911', icon: '🔥' },
        { name: 'Police', phone: '911', icon: '👮' },
        { name: 'Medical Emergency', phone: '911', icon: '🚑' },
        { name: 'Cyber Crime', phone: '1-800-CYBER', icon: '💻' }
    ];

    return (
        <footer className="footer-container">
            {/* Emergency Banner */}
            <div className="emergency-banner">
                <div className="emergency-content">
                    <div className="emergency-icon">
                        <svg className="pulse-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="emergency-text">
                        <h3>Emergency? Call 911 Immediately</h3>
                        <p>For life-threatening emergencies, don't use this platform - call emergency services directly</p>
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="footer-main">
                <div className="footer-grid">
                    {/* Brand Section */}
                    <div className="footer-section brand-section">
                        <div className="footer-logo">
                            <svg className="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="logo-text">Rescue</span>
                        </div>
                        <p className="brand-description">
                            Connecting communities with emergency services through real-time incident reporting and response coordination.
                        </p>
                        <div className="social-links">
                            <a href="#" className="social-link" aria-label="Twitter">
                                <svg className="social-icon" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                            </a>
                            <a href="#" className="social-link" aria-label="Facebook">
                                <svg className="social-icon" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                            <a href="#" className="social-link" aria-label="LinkedIn">
                                <svg className="social-icon" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-section">
                        <h3 className="footer-heading">Quick Access</h3>
                        <ul className="footer-links">
                            {quickLinks.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href} className="footer-link">
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Emergency Services */}
                    <div className="footer-section">
                        <h3 className="footer-heading">Emergency Services</h3>
                        <div className="emergency-services">
                            {emergencyServices.map((service, index) => (
                                <div key={index} className="emergency-service">
                                    <span className="service-icon">{service.icon}</span>
                                    <div className="service-info">
                                        <span className="service-name">{service.name}</span>
                                        <span className="service-phone">{service.phone}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legal */}
                    <div className="footer-section">
                        <h3 className="footer-heading">Legal & Privacy</h3>
                        <ul className="footer-links">
                            {legalLinks.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href} className="footer-link">
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <div className="compliance-badges">
                            <div className="compliance-badge">
                                <span className="badge-icon">🔒</span>
                                <span className="badge-text">GDPR Compliant</span>
                            </div>
                            <div className="compliance-badge">
                                <span className="badge-icon">⚡</span>
                                <span className="badge-text">24/7 Support</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="footer-bottom">
                <div className="footer-bottom-content">
                    <div className="copyright">
                        <p>&copy; {currentYear} Rescue Emergency Platform. All rights reserved.</p>
                        <p className="disclaimer">
                            This platform is for non-emergency incident reporting. For immediate emergencies, always call 911.
                        </p>
                    </div>
                    <div className="footer-status">
                        <div className="status-indicator">
                            <div className="status-dot"></div>
                            <span>System Operational</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}