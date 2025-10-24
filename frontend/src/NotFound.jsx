import React from "react";
import { Home, ArrowLeft, AlertCircle, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GridDistortion from "./GridDistortion";
import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <div className="notfound-wrapper">
            {/* Background Effect - Preserved */}
            <div className="notfound-background-effect">
                <GridDistortion
                    imageSrc="/notFound.jpg"
                    grid={10}
                    mouse={0.1}
                    strength={0.15}
                    relaxation={0.9}
                    className="custom-class"
                />
            </div>

            {/* Content Overlay */}
            <div className="notfound-content">
                <div className="notfound-card">
                    {/* Icon Section */}
                    <div className="notfound-icon-wrapper">
                        <AlertCircle className="notfound-alert-icon" />
                        <MapPin className="notfound-map-icon" />
                    </div>

                    {/* Error Code */}
                    <h1 className="notfound-code">404</h1>

                    {/* Message */}
                    <h2 className="notfound-title">Page Not Found</h2>
                    <p className="notfound-description">
                        Oops! The page you're looking for seems to have wandered off the map.
                        <br />
                        Let's get you back on track.
                    </p>

                    {/* Navigation Buttons */}
                    <div className="notfound-actions">
                        <button 
                            className="notfound-btn notfound-btn-primary"
                            onClick={handleGoHome}
                        >
                            <Home className="btn-icon" />
                            <span>Go Home</span>
                        </button>
                        
                        <button 
                            className="notfound-btn notfound-btn-secondary"
                            onClick={handleGoBack}
                        >
                            <ArrowLeft className="btn-icon" />
                            <span>Go Back</span>
                        </button>
                    </div>

                    {/* Additional Help */}
                    <div className="notfound-help">
                        <p>Need help? Try searching for what you need or contact support.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}