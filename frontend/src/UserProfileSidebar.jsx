import React from 'react';
import profileStyles from './UserProfile.module.css';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from './auth/redux/authSlice';
import { 
    User, 
    Settings, 
    Bell, 
    Clock,
    LogOut,
    CircleAlert,
    BarChart3,
} from 'lucide-react';
import CloudImage from './utils/CloudImage';

const cx = (classNames) => classNames.split(/\s+/).map((className) => profileStyles[className] ?? className).join(" ");

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
        { id: 'my-complaint', label: 'Complaints', icon: CircleAlert },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'History', label: 'History', icon: Clock },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const imgSrc = userData.profileImage.includes("cloudinary") ? userData.profileImage : userData.profileImage;

    return (
        <div className={cx("profile-sidebar")}>
            <div className={cx("sidebar-content")}>

                {/* User Quick Info */}
                <div className={cx("user-quick-info")}>
                    <div className={cx("user-info-content")}>
                        {/* <img
                            src={userData.profileImage}
                            alt={userData.name}
                            className={cx("user-quick-avatar")}
                            onError={(e) => {
                                e.target.src = "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png";
                            }}
                        /> */}
                        <CloudImage
                            src={imgSrc}
                            alt={userData.name}
                            className={cx("w-12 h-12 rounded-full object-cover shadow-md user-quick-avatar")}
                        />
                        <div>
                            <h3 className={cx("user-quick-name")}>{userData.name}</h3>
                            <p className={cx("user-quick-role")}>{userData.role}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className={cx("profile-nav")}>
                    {sidebarLinks.map((link, index) => {
                        const IconComponent = link.icon;
                        return (
                            <button
                                key={link.id}
                                onClick={() => setActiveSection(link.id)}
                                className={cx(`nav-link ${activeSection === link.id ? 'active' : ''}`)}
                                style={{ '--delay': `${index * 0.1}s` }}
                            >
                                <IconComponent className={cx("nav-icon")} />
                                <span>{link.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Logout Button */}
                <div className={cx("logout-container")}>
                    <button onClick={handleLogout} className={cx("logout-btn")}>
                        <LogOut className={cx("nav-icon")} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserProfileSidebar;
