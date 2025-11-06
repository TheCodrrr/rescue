import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ComplaintCardMap.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Officer icon (blue)
const officerIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#667eea" width="32" height="32">
            <circle cx="12" cy="12" r="10" fill="#667eea" stroke="white" stroke-width="2"/>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
        </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

// Complaint icon (red)
const complaintIcon = (severity) => {
    const colors = {
        low: '#51cf66',
        medium: '#f6b93b',
        high: '#ee5a6f'
    };
    
    return new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${colors[severity]}" width="32" height="32">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${colors[severity]}" stroke="white" stroke-width="1.5"/>
            </svg>
        `),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

const ComplaintCardMap = ({ officerLocation, complaintLocation, severity }) => {
    if (!officerLocation?.latitude || !officerLocation?.longitude) {
        return (
            <div className="complaint-card-map-placeholder">
                <p>Officer location not available</p>
            </div>
        );
    }

    if (!complaintLocation?.coordinates || complaintLocation.coordinates.length !== 2) {
        return (
            <div className="complaint-card-map-placeholder">
                <p>Complaint location not available</p>
            </div>
        );
    }

    const [lng, lat] = complaintLocation.coordinates;
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return (
            <div className="complaint-card-map-placeholder">
                <p>Invalid complaint coordinates</p>
            </div>
        );
    }

    // Calculate center point between officer and complaint
    const centerLat = (officerLocation.latitude + lat) / 2;
    const centerLng = (officerLocation.longitude + lng) / 2;

    // Calculate bounds to fit both markers
    const bounds = [
        [officerLocation.latitude, officerLocation.longitude],
        [lat, lng]
    ];

    // Line coordinates for connection
    const lineCoordinates = [
        [officerLocation.latitude, officerLocation.longitude],
        [lat, lng]
    ];

    return (
        <div className="complaint-card-map-container">
            <MapContainer
                center={[centerLat, centerLng]}
                zoom={13}
                bounds={bounds}
                boundsOptions={{ padding: [30, 30] }}
                className="complaint-card-map"
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Line connecting officer and complaint */}
                <Polyline
                    positions={lineCoordinates}
                    pathOptions={{
                        color: '#667eea',
                        weight: 2,
                        opacity: 0.7,
                        dashArray: '5, 10'
                    }}
                />
                
                {/* Officer marker */}
                <Marker 
                    position={[officerLocation.latitude, officerLocation.longitude]}
                    icon={officerIcon}
                />
                
                {/* Complaint marker */}
                <Marker
                    position={[lat, lng]}
                    icon={complaintIcon(severity)}
                />
            </MapContainer>
        </div>
    );
};

export default ComplaintCardMap;
