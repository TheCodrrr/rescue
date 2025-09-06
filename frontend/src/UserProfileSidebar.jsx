import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from './auth/redux/authSlice';
import { 
    User, 
    Settings, 
    Bell, 
    Clock, 
    Activity, 
    LogOut, 
    ArrowLeft,
    Shield
} from 'lucide-react';

function UserProfileSidebar({ activeSection, setActiveSection, onBackToHome }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    // Use real user data from Redux or fallback to defaults
    const userData = user ? {
        name: user.name || "Unknown User",
        role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User",
        profileImage: user.profileImage || "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png"
    } : {
        name: "Loading...",
        role: "Loading...",
        profileImage: "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png"
    };

    const sidebarLinks = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'History', label: 'History', icon: Clock },
        { id: 'activity', label: 'Activity Log', icon: Activity },
    ];

    return (
        <div className="profile-sidebar">
            <div className="sidebar-content">
                {/* Logo Section */}
                <div className="profile-logo">
                    <div className="logo-icon">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="logo-text">RescueApp</span>
                </div>

                {/* User Quick Info */}
                <div className="user-quick-info">
                    <div className="user-info-content">
                        <img
                            src={userData.profileImage}
                            alt={userData.name}
                            className="user-quick-avatar"
                            onError={(e) => {
                                e.target.src = "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png";
                            }}
                        />
                        <div>
                            <h3 className="user-quick-name">{userData.name}</h3>
                            <p className="user-quick-role">{userData.role}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="profile-nav">
                    {sidebarLinks.map((link, index) => {
                        const IconComponent = link.icon;
                        return (
                            <button
                                key={link.id}
                                onClick={() => setActiveSection(link.id)}
                                className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
                                style={{ '--delay': `${index * 0.1}s` }}
                            >
                                <IconComponent className="nav-icon" />
                                <span>{link.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Logout Button */}
                <div className="logout-container">
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut className="nav-icon" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserProfileSidebar;
