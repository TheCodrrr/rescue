import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ComplaintMap.css';

// Fix for default marker icons in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon for officer location
const officerIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#667eea" width="40" height="40">
            <circle cx="12" cy="12" r="10" fill="#667eea" stroke="white" stroke-width="2"/>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
});

// Custom icons for different severity levels
const createComplaintIcon = (severity) => {
    const colors = {
        low: '#51cf66',
        medium: '#f6b93b',
        high: '#ee5a6f'
    };
    
    return new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${colors[severity]}" width="35" height="35">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${colors[severity]}" stroke="white" stroke-width="1"/>
            </svg>
        `),
        iconSize: [35, 35],
        iconAnchor: [17.5, 35],
        popupAnchor: [0, -35],
    });
};

// Component to auto-fit map bounds
const FitBounds = ({ bounds }) => {
    const map = useMap();
    
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        }
    }, [bounds, map]);
    
    return null;
};

const ComplaintMap = ({ officerLocation, complaints, onComplaintClick }) => {
    const mapRef = useRef(null);

    // Calculate bounds to fit all markers
    const calculateBounds = () => {
        const bounds = [];
        
        if (officerLocation.latitude && officerLocation.longitude) {
            bounds.push([officerLocation.latitude, officerLocation.longitude]);
        }
        
        complaints.forEach(complaint => {
            if (complaint.location && complaint.location.coordinates) {
                const [lng, lat] = complaint.location.coordinates;
                bounds.push([lat, lng]);
            }
        });
        
        return bounds;
    };

    const bounds = calculateBounds();
    const center = officerLocation.latitude && officerLocation.longitude 
        ? [officerLocation.latitude, officerLocation.longitude]
        : [23.0225, 72.5714]; // Default to Ahmedabad

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance.toFixed(2);
    };

    return (
        <div className="complaint-map-container">
            <MapContainer
                center={center}
                zoom={12}
                ref={mapRef}
                className="complaint-map"
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Auto-fit bounds */}
                <FitBounds bounds={bounds} />
                
                {/* Officer location marker */}
                {officerLocation.latitude && officerLocation.longitude && (
                    <>
                        <Marker 
                            position={[officerLocation.latitude, officerLocation.longitude]}
                            icon={officerIcon}
                        >
                            <Popup>
                                <div className="map-popup officer-popup">
                                    <h3>👮 Your Location</h3>
                                    <p><strong>Latitude:</strong> {officerLocation.latitude.toFixed(6)}</p>
                                    <p><strong>Longitude:</strong> {officerLocation.longitude.toFixed(6)}</p>
                                </div>
                            </Popup>
                        </Marker>
                        
                        {/* Circles showing severity zones */}
                        <Circle
                            center={[officerLocation.latitude, officerLocation.longitude]}
                            radius={10000}
                            pathOptions={{ 
                                color: '#51cf66', 
                                fillColor: '#51cf66', 
                                fillOpacity: 0.1,
                                weight: 1
                            }}
                        />
                        <Circle
                            center={[officerLocation.latitude, officerLocation.longitude]}
                            radius={20000}
                            pathOptions={{ 
                                color: '#f6b93b', 
                                fillColor: '#f6b93b', 
                                fillOpacity: 0.1,
                                weight: 1
                            }}
                        />
                        <Circle
                            center={[officerLocation.latitude, officerLocation.longitude]}
                            radius={100000}
                            pathOptions={{ 
                                color: '#ee5a6f', 
                                fillColor: '#ee5a6f', 
                                fillOpacity: 0.05,
                                weight: 1
                            }}
                        />
                    </>
                )}
                
                {/* Complaint markers */}
                {complaints.map((complaint) => {
                    if (!complaint.location || !complaint.location.coordinates) return null;
                    
                    const [lng, lat] = complaint.location.coordinates;
                    const distance = officerLocation.latitude && officerLocation.longitude
                        ? calculateDistance(officerLocation.latitude, officerLocation.longitude, lat, lng)
                        : 'N/A';
                    
                    return (
                        <Marker
                            key={complaint._id}
                            position={[lat, lng]}
                            icon={createComplaintIcon(complaint.severity)}
                            eventHandlers={{
                                click: () => {
                                    if (onComplaintClick) {
                                        onComplaintClick(complaint);
                                    }
                                }
                            }}
                        >
                            <Popup maxWidth={300}>
                                <div className={`map-popup complaint-popup severity-${complaint.severity}`}>
                                    <div className="popup-header">
                                        <h3>{complaint.title}</h3>
                                        <span className={`popup-severity-badge ${complaint.severity}`}>
                                            {complaint.severity}
                                        </span>
                                    </div>
                                    
                                    <p className="popup-description">
                                        {complaint.description?.substring(0, 100)}
                                        {complaint.description?.length > 100 ? '...' : ''}
                                    </p>
                                    
                                    <div className="popup-details">
                                        <div className="popup-detail-item">
                                            <strong>Category:</strong> {complaint.category}
                                        </div>
                                        <div className="popup-detail-item">
                                            <strong>Status:</strong> 
                                            <span className={`status-${complaint.status}`}>
                                                {complaint.status}
                                            </span>
                                        </div>
                                        <div className="popup-detail-item">
                                            <strong>Distance:</strong> {distance} km
                                        </div>
                                        <div className="popup-detail-item">
                                            <strong>Address:</strong> {complaint.address || 'N/A'}
                                        </div>
                                        <div className="popup-detail-item">
                                            <strong>Reported:</strong> {formatDate(complaint.createdAt)}
                                        </div>
                                    </div>
                                    
                                    {complaint.user_id && (
                                        <div className="popup-user">
                                            <img 
                                                src={complaint.user_id.profileImage || '/default-avatar.png'} 
                                                alt={complaint.user_id.name}
                                            />
                                            <span>{complaint.user_id.name}</span>
                                        </div>
                                    )}
                                    
                                    <button 
                                        className="popup-view-btn"
                                        onClick={() => onComplaintClick && onComplaintClick(complaint)}
                                    >
                                        View Full Details
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
            
            {/* Map Legend */}
            <div className="map-legend">
                <h4>Map Legend</h4>
                <div className="legend-item">
                    <div className="legend-icon officer"></div>
                    <span>Your Location</span>
                </div>
                <div className="legend-item">
                    <div className="legend-icon high"></div>
                    <span>High Severity (100km)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-icon medium"></div>
                    <span>Medium Severity (20km)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-icon low"></div>
                    <span>Low Severity (10km)</span>
                </div>
            </div>
        </div>
    );
};

export default ComplaintMap;
