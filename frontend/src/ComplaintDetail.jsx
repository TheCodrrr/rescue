import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import Navbar from "./Navbar";
import Footer from "./Footer";
import CommentModal from "./CommentModal.jsx";
import { 
  FiThumbsUp, 
  FiThumbsDown, 
  FiMessageCircle, 
  FiMapPin, 
  FiCalendar,
  FiUser,
  FiAlertTriangle,
  FiCheckCircle,
  FiArrowLeft,
  FiExternalLink,
  FiEdit3,
  FiTrash2,
  FiClock,
  FiNavigation,
  FiInfo
} from 'react-icons/fi';
import { 
  MdLocalFireDepartment,
  MdBalance,
  MdConstruction,
  MdTrain,
  MdSpeed,
  MdDirectionsTransit,
  MdDirectionsRailway,
  MdAccessTime,
  MdLocationOn,
  MdSchedule,
  MdFlag,
  MdMyLocation
} from 'react-icons/md';
import { 
    fetchComplaintById,
    upvoteComplaint,
    downvoteComplaint,
    updateComplaintStatus,
    deleteComplaint,
    fetchComments,
    addComment,
    updateComment,
    removeComment,
    clearSuccess,
    clearError
} from './auth/redux/complaintSlice';
import { 
    rejectComplaint, 
    acceptComplaint, 
    addEscalationEvent 
} from './auth/redux/officerSlice';
import { 
    addComplaintVoteHistory, 
    addComplaintStatusUpdatedHistory,
    addCommentHistory,
    addComplaintEscalatedHistory
} from './auth/redux/historySlice';
import EscalationBadge, { EscalationTimeline } from './EscalationBadge';
import ComplaintProgress from './ComplaintProgress';
import "./Complaint.css";
import "./ComplaintDetail.css";
import "./Toast.css";

// Fix for Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ComplaintDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const { 
        selectedComplaint, 
        isLoading, 
        error,
        success 
    } = useSelector((state) => state.complaints);
    console.log("The selected complaint is: ", selectedComplaint);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    
    const [votingInProgress, setVotingInProgress] = useState({});
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [statusUpdateInProgress, setStatusUpdateInProgress] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const [assignmentInProgress, setAssignmentInProgress] = useState(false);
    const [complaintIgnored, setComplaintIgnored] = useState(false);
    const socketRef = useRef(null);

    // Socket.io connection for real-time notifications (when viewing complaint as owner)
    useEffect(() => {
        // Only setup socket if user is authenticated and is the complaint owner
        if (!user || !selectedComplaint || selectedComplaint.user_id?._id !== user._id) {
            return;
        }

        const socketURL = import.meta.env.VITE_SOCKET_URL || 
                          import.meta.env.REACT_APP_SOCKET_URL || 
                          'http://localhost:5000';

        console.log("🔌 ComplaintDetail connecting to socket for user:", user._id);

        socketRef.current = io(socketURL, {
            reconnection: true,
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
            console.log('✅ ComplaintDetail socket connected:', socketRef.current.id);
        });

        socketRef.current.on('disconnect', (reason) => {
            console.log('❌ ComplaintDetail socket disconnected:', reason);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('🔴 ComplaintDetail socket connection error:', error);
        });

        // Listen for notifications specific to this user
        const notificationEvent = `notification:${user._id}`;
        console.log('👂 ComplaintDetail listening for notifications on event:', notificationEvent);

        socketRef.current.on(notificationEvent, (notificationData) => {
            console.log('🔔 ComplaintDetail received real-time notification:', notificationData);
            
            // Show toast notification if it's related to the current complaint
            if (notificationData.complaint_id === id) {
                toast.success(
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong>Complaint Update</strong>
                        <span style={{ fontSize: '0.9em' }}>
                            Your complaint has been escalated to Level {notificationData.to_level}
                        </span>
                    </div>,
                    {
                        duration: 5000,
                        position: 'top-right',
                        icon: '🔔',
                        style: {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '16px',
                            borderRadius: '12px',
                        }
                    }
                );

                // Refresh complaint details to show updated status
                dispatch(fetchComplaintById(id));
            }
        });

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                console.log('🔌 Disconnecting ComplaintDetail socket');
                socketRef.current.off(notificationEvent);
                socketRef.current.disconnect();
            }
        };
    }, [user, selectedComplaint, id, dispatch]);

    // Fetch complaint details on component mount
    useEffect(() => {
        if (id) {
            dispatch(fetchComplaintById(id)).then((result) => {
                // After successfully fetching complaint, also fetch comments to get the correct count
                if (fetchComplaintById.fulfilled.match(result)) {
                    dispatch(fetchComments(id));
                }
            });
        }
        
        // Scroll to top when component mounts with a slight delay for better UX
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        };
        
        // Immediate scroll
        scrollToTop();
        
        // Backup scroll after a short delay (in case of slow rendering)
        const timeoutId = setTimeout(scrollToTop, 100);
        
        return () => clearTimeout(timeoutId);
    }, [id, dispatch]);

    // Handle success and error states
    useEffect(() => {
        if (success) {
            dispatch(clearSuccess());
        }
        if (error) {
            toast.error(error, {
                duration: 3000,
                position: 'top-center',
            });
            dispatch(clearError());
        }
    }, [success, error, dispatch]);

    const categories = [
        { value: 'rail', label: 'Rail Incidents', icon: <MdTrain />, color: '#f59e0b' },
        { value: 'road', label: 'Road Issues', icon: <MdConstruction />, color: '#db2777' },
        { value: 'fire', label: 'Fire Emergency', icon: <MdLocalFireDepartment />, color: '#ef4444' },
        { value: 'cyber', label: 'Cyber Crime', icon: <FiAlertTriangle />, color: '#8b5cf6' },
        { value: 'police', label: 'Police', icon: <FiAlertTriangle />, color: '#3b82f6' },
        { value: 'court', label: 'Court', icon: <MdBalance />, color: '#10b981' }
    ];

    const getCategoryIcon = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.icon : <FiAlertTriangle />;
    };

    const getCategoryColor = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.color : '#6b7280';
    };

    const getCategoryLabel = (category) => {
        const categoryData = categories.find(cat => cat.value === category);
        return categoryData ? categoryData.label : category;
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'cd-status-badge-pending';
            case 'in-progress': return 'cd-status-badge-in-progress';
            case 'resolved': return 'cd-status-badge-resolved';
            case 'rejected': return 'cd-status-badge-rejected';
            default: return 'cd-status-badge-pending';
        }
    };

    // Map frontend status values to backend format
    const mapStatusToBackend = (frontendStatus) => {
        const statusMapping = {
            'pending': 'pending',
            'in-progress': 'in_progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMapping[frontendStatus] || frontendStatus;
    };

    // Map backend status values to frontend format
    const mapStatusToFrontend = (backendStatus) => {
        const statusMapping = {
            'pending': 'pending',
            'in_progress': 'in-progress',
            'resolved': 'resolved',
            'rejected': 'rejected'
        };
        return statusMapping[backendStatus] || backendStatus;
    };

    const getSeverityInfo = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'low':
                return { label: 'Low', class: 'cd-severity-low', icon: '🟢' };
            case 'medium':
                return { label: 'Medium', class: 'cd-severity-medium', icon: '🟡' };
            case 'high':
                return { label: 'High', class: 'cd-severity-high', icon: '🟠' };
            case 'critical':
                return { label: 'Critical', class: 'cd-severity-critical', icon: '🔴' };
            default:
                return { label: 'Unknown', class: 'cd-severity-medium', icon: '🟡' };
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper function to safely access nested properties
    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((curr, key) => curr?.[key], obj) ?? defaultValue;
        } catch (error) {
            return defaultValue;
        }
    };

    // Helper function to format frequency data
    const formatFrequency = (frequency) => {
        if (!frequency || typeof frequency !== 'object') return 'Not available';
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const runningDays = Object.keys(frequency)
            .filter(key => frequency[key] === true)
            .map(key => days[parseInt(key)] || `Day ${key}`)
            .filter(Boolean);
        
        return runningDays.length > 0 ? runningDays.join(', ') : 'Not available';
    };

    // Helper function to format train type
    const formatTrainType = (trainType) => {
        if (!trainType) return 'Unknown';
        return trainType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Helper function to format time from MM.SS to MM:SS
    const formatTime = (timeStr) => {
        if (!timeStr || timeStr === 'First' || timeStr === 'Last') return timeStr;
        return timeStr.replace('.', ':');
    };

    // Helper function to get coordinates in consistent format [lat, lng]
    const getCoordinates = (complaint) => {
        if (!complaint?.location) return null;
        
        // Handle different coordinate formats
        if (complaint.location.coordinates && Array.isArray(complaint.location.coordinates)) {
            // GeoJSON format: [longitude, latitude]
            return [complaint.location.coordinates[1], complaint.location.coordinates[0]];
        } else if (complaint.location.latitude && complaint.location.longitude) {
            // Standard format: {latitude, longitude}
            return [complaint.location.latitude, complaint.location.longitude];
        }
        
        return null;
    };

    // Rail Speed Gauge Component
    const RailSpeedGauge = ({ speed, maxSpeed = 160 }) => {
        const svgRef = useRef();
        
        useEffect(() => {
            if (!speed || !svgRef.current) return;
            
            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();
            
            const width = 200;
            const height = 120;
            const radius = 80;
            
            const arc = d3.arc()
                .innerRadius(radius - 20)
                .outerRadius(radius)
                .startAngle(-Math.PI / 2)
                .cornerRadius(10);
            
            const g = svg.append("g")
                .attr("transform", `translate(${width/2}, ${height - 20})`);
            
            // Background arc
            g.append("path")
                .datum({endAngle: Math.PI / 2})
                .style("fill", "rgba(255, 255, 255, 0.1)")
                .attr("d", arc);
            
            // Speed arc
            const speedAngle = (speed / maxSpeed) * Math.PI - Math.PI / 2;
            g.append("path")
                .datum({endAngle: speedAngle})
                .style("fill", speed > 100 ? "#ef4444" : speed > 60 ? "#f59e0b" : "#22c55e")
                .attr("d", arc)
                .style("filter", "drop-shadow(0 0 8px rgba(96, 165, 250, 0.6))");
            
            // Center text
            g.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "-10px")
                .style("font-size", "24px")
                .style("font-weight", "bold")
                .style("fill", "#fff")
                .text(speed);
            
            g.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "10px")
                .style("font-size", "12px")
                .style("fill", "rgba(255, 255, 255, 0.8)")
                .text("km/h");
                
        }, [speed, maxSpeed]);
        
        return (
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="cd-rail-speed-gauge"
            >
                <svg ref={svgRef} width="200" height="120"></svg>
            </motion.div>
        );
    };

    // Enhanced Rail Route Timeline Component with All Stations
    const RailRouteTimeline = ({ fromStation, toStation, totalDistance, stations = [] }) => {
        const [animationProgress, setAnimationProgress] = useState(0);
        const [selectedStation, setSelectedStation] = useState(null);

        useEffect(() => {
            const timer = setTimeout(() => {
                setAnimationProgress(100);
            }, 1000);
            return () => clearTimeout(timer);
        }, []);

        // Use stations array if available, otherwise fallback to basic route
        const routeStations = stations && stations.length > 0 ? stations : [fromStation, toStation].filter(Boolean);

        if (!routeStations || routeStations.length === 0) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="cd-rail-route-timeline"
            >
                <div className="cd-route-overview">
                    <div className="cd-route-summary">
                        <div className="cd-route-info-item">
                            <span className="cd-route-label">Total Stations:</span>
                            <span className="cd-route-value">{routeStations.length}</span>
                        </div>
                        <div className="cd-route-info-item">
                            <span className="cd-route-label">Total Distance:</span>
                            <span className="cd-route-value">{totalDistance} km</span>
                        </div>
                        <div className="cd-route-info-item">
                            <span className="cd-route-label">Journey Time:</span>
                            <span className="cd-route-value">
                                {routeStations.length > 1 ? 
                                    `${formatTime(routeStations[0]?.depart || routeStations[0]?.time || 'N/A')} - ${formatTime(routeStations[routeStations.length - 1]?.arrive || routeStations[routeStations.length - 1]?.time || 'N/A')}` 
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="cd-stations-timeline">
                    {routeStations.map((station, index) => {
                        const isFirst = index === 0;
                        const isLast = index === routeStations.length - 1;
                        const progress = ((index) / Math.max(routeStations.length - 1, 1)) * 100;
                        
                        // Handle both new station format and old format
                        const stationName = station.source_stn_name || station.name || `Station ${index + 1}`;
                        const stationCode = station.source_stn_code || station.code || 'N/A';
                        
                        return (
                            <motion.div
                                key={`${stationCode}-${index}`}
                                className={`cd-station-item ${isFirst ? 'cd-station-first' : ''} ${isLast ? 'cd-station-last' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                onHoverStart={() => setSelectedStation(station)}
                                onHoverEnd={() => setSelectedStation(null)}
                            >
                                <div className="cd-station-timeline-track">
                                    <div 
                                        className={`cd-station-dot ${isFirst ? 'cd-dot-start' : isLast ? 'cd-dot-end' : 'cd-dot-middle'}`}
                                    >
                                        {isFirst ? <MdMyLocation /> : isLast ? <MdFlag /> : <MdLocationOn />}
                                    </div>
                                    {!isLast && (
                                        <motion.div 
                                            className="cd-station-connector"
                                            initial={{ scaleY: 0 }}
                                            animate={{ 
                                                scaleY: animationProgress >= progress ? 1 : 0 
                                            }}
                                            transition={{ 
                                                duration: 0.3, 
                                                delay: 1 + (index * 0.05) 
                                            }}
                                        />
                                    )}
                                </div>
                                
                                <div className="cd-station-info">
                                    <div className="cd-station-main-info">
                                        <h4 className="cd-station-name">
                                            {stationName}
                                        </h4>
                                        <span className="cd-station-code-badge">
                                            {stationCode}
                                        </span>
                                    </div>
                                    
                                    <div className="cd-station-timing">
                                        {station.arrive && station.arrive !== 'First' && (
                                            <span className="cd-station-time cd-arrival-time">
                                                <MdSchedule /> {formatTime(station.arrive)}
                                            </span>
                                        )}
                                        {station.depart && station.depart !== 'Last' && (
                                            <span className="cd-station-time cd-departure-time">
                                                <MdSchedule /> {formatTime(station.depart)}
                                            </span>
                                        )}
                                        {station.arrive === 'First' && (
                                            <span className="cd-station-time cd-origin-time">
                                                <MdMyLocation /> {formatTime(station.depart)}
                                            </span>
                                        )}
                                        {station.depart === 'Last' && (
                                            <span className="cd-station-time cd-destination-time">
                                                <MdFlag /> {formatTime(station.arrive)}
                                            </span>
                                        )}
                                        {station.time && !station.arrive && !station.depart && (
                                            <span className="cd-station-time cd-general-time">
                                                <MdAccessTime /> {formatTime(station.time)}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="cd-station-details">
                                        <span className="cd-station-distance">
                                            <MdDirectionsRailway /> {station.distance || 'N/A'} km
                                        </span>
                                        {station.zone && (
                                            <span className="cd-station-zone">
                                                <MdLocationOn /> {station.zone}
                                            </span>
                                        )}
                                        {station.day && (
                                            <span className="cd-station-day">
                                                <MdAccessTime /> Day {station.day}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {selectedStation && (
                    <motion.div
                        className="cd-station-tooltip"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h5>{selectedStation.source_stn_name || selectedStation.name}</h5>
                        <p>Code: {selectedStation.source_stn_code || selectedStation.code}</p>
                        <p>Distance: {selectedStation.distance} km</p>
                        {selectedStation.zone && <p>Zone: {selectedStation.zone}</p>}
                        {selectedStation.arrive && selectedStation.arrive !== 'First' && (
                            <p>Arrival: {formatTime(selectedStation.arrive)}</p>
                        )}
                        {selectedStation.depart && selectedStation.depart !== 'Last' && (
                            <p>Departure: {formatTime(selectedStation.depart)}</p>
                        )}
                    </motion.div>
                )}
            </motion.div>
        );
    };

    // Rail Frequency Chart Component
    const RailFrequencyChart = ({ frequency }) => {
        const svgRef = useRef();
        
        useEffect(() => {
            if (!frequency || !svgRef.current) return;
            
            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();
            
            const width = 300;
            const height = 60;
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayWidth = width / days.length;
            
            const g = svg.append("g");
            
            days.forEach((day, i) => {
                const isActive = frequency[i] === true;
                
                g.append("rect")
                    .attr("x", i * dayWidth + 5)
                    .attr("y", 10)
                    .attr("width", dayWidth - 10)
                    .attr("height", 30)
                    .attr("rx", 8)
                    .style("fill", isActive ? "#22c55e" : "rgba(255, 255, 255, 0.1)")
                    .style("stroke", isActive ? "#16a34a" : "rgba(255, 255, 255, 0.2)")
                    .style("stroke-width", 1)
                    .style("filter", isActive ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))" : "none")
                    .style("transition", "all 0.3s ease");
                
                g.append("text")
                    .attr("x", i * dayWidth + dayWidth / 2)
                    .attr("y", 30)
                    .attr("text-anchor", "middle")
                    .style("font-size", "10px")
                    .style("font-weight", "600")
                    .style("fill", isActive ? "#fff" : "rgba(255, 255, 255, 0.6)")
                    .text(day);
            });
            
        }, [frequency]);
        
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="cd-rail-frequency-chart"
            >
                <svg ref={svgRef} width="300" height="60"></svg>
            </motion.div>
        );
    };

    // Train Journey Summary Component
    const TrainJourneySummary = ({ stations }) => {
        if (!stations || stations.length === 0) return null;

        const firstStation = stations[0];
        const lastStation = stations[stations.length - 1];
        const totalJourneyTime = calculateJourneyTime(firstStation, lastStation);
        const averageSpeed = safeGet(selectedComplaint, 'category_specific_data.avg_speed');

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="cd-journey-summary"
            >
                <div className="cd-journey-header">
                    <h4><MdTrain /> Journey Overview</h4>
                </div>
                
                <div className="cd-journey-stats">
                    <div className="cd-journey-stat">
                        <span className="cd-stat-icon"><MdLocationOn /></span>
                        <span className="cd-stat-label">Total Stations</span>
                        <span className="cd-stat-value">{stations.length}</span>
                    </div>
                    
                    <div className="cd-journey-stat">
                        <span className="cd-stat-icon"><MdDirectionsRailway /></span>
                        <span className="cd-stat-label">Distance</span>
                        <span className="cd-stat-value">{lastStation.distance} km</span>
                    </div>
                    
                    <div className="cd-journey-stat">
                        <span className="cd-stat-icon"><MdAccessTime /></span>
                        <span className="cd-stat-label">Duration</span>
                        <span className="cd-stat-value">{totalJourneyTime}</span>
                    </div>
                    
                    {averageSpeed && (
                        <div className="cd-journey-stat">
                            <span className="cd-stat-icon"><MdSpeed /></span>
                            <span className="cd-stat-label">Avg Speed</span>
                            <span className="cd-stat-value">{averageSpeed} km/h</span>
                        </div>
                    )}
                </div>

                <div className="cd-journey-endpoints">
                    <div className="cd-endpoint cd-origin">
                        <div className="cd-endpoint-icon"><MdMyLocation /></div>
                        <div className="cd-endpoint-info">
                            <h5>{firstStation.source_stn_name}</h5>
                            <span className="cd-endpoint-code">{firstStation.source_stn_code}</span>
                            <span className="cd-endpoint-time">Departs: {formatTime(firstStation.depart)}</span>
                        </div>
                    </div>
                    
                    <div className="cd-journey-arrow">
                        <motion.div
                            animate={{ x: [0, 10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <MdDirectionsRailway />
                        </motion.div>
                    </div>
                    
                    <div className="cd-endpoint cd-destination">
                        <div className="cd-endpoint-icon"><MdFlag /></div>
                        <div className="cd-endpoint-info">
                            <h5>{lastStation.source_stn_name}</h5>
                            <span className="cd-endpoint-code">{lastStation.source_stn_code}</span>
                            <span className="cd-endpoint-time">Arrives: {formatTime(lastStation.arrive)}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Helper function to calculate journey time
    const calculateJourneyTime = (startStation, endStation) => {
        if (!startStation?.depart || !endStation?.arrive) return 'N/A';
        
        try {
            const startTime = startStation.depart;
            const endTime = endStation.arrive;
            
            // Parse time strings (assuming HH.MM or HH:MM format)
            const parseTime = (timeStr) => {
                const [hours, minutes] = timeStr.split(/[.:]/).map(Number);
                return hours * 60 + minutes;
            };
            
            const startMinutes = parseTime(startTime);
            const endMinutes = parseTime(endTime);
            
            let duration = endMinutes - startMinutes;
            
            // Handle overnight journeys
            if (duration < 0) {
                duration += 24 * 60;
            }
            
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            
            return `${hours}h ${minutes}m`;
        } catch (error) {
            return 'N/A';
        }
    };

    // Enhanced Train Info Card Component
    const TrainInfoCard = ({ icon, label, value, color = "#60a5fa", delay = 0 }) => (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ y: -5, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)" }}
            className="cd-rail-info-item cd-enhanced-info-card"
        >
            <div className="cd-rail-info-icon" style={{ color }}>
                {icon}
            </div>
            <div className="cd-rail-info-content">
                <span className="cd-rail-info-label">{label}</span>
                <span className="cd-rail-info-value">{value}</span>
            </div>
        </motion.div>
    );

    const handleUpvote = async () => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to vote', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }
        
        // Set voting in progress
        setVotingInProgress(prev => ({ ...prev, [`${id}-upvote`]: true }));
        
        try {
            const result = await dispatch(upvoteComplaint(id));
            if (upvoteComplaint.fulfilled.match(result)) {
                // Add history entry for upvote
                if (user && selectedComplaint) {
                    dispatch(addComplaintVoteHistory({
                        userId: user._id,
                        complaintId: id,
                        category: selectedComplaint.category,
                        voteType: 'upvote'
                    }));
                }
                
                toast.success('Upvoted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    icon: <FiThumbsUp />,
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to upvote. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while voting. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear voting in progress
            setVotingInProgress(prev => ({ ...prev, [`${id}-upvote`]: false }));
        }
    };

    const handleDownvote = async () => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to vote', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }
        
        // Set voting in progress
        setVotingInProgress(prev => ({ ...prev, [`${id}-downvote`]: true }));
        
        try {
            const result = await dispatch(downvoteComplaint(id));
            if (downvoteComplaint.fulfilled.match(result)) {
                // Add history entry for downvote
                if (user && selectedComplaint) {
                    dispatch(addComplaintVoteHistory({
                        userId: user._id,
                        complaintId: id,
                        category: selectedComplaint.category,
                        voteType: 'downvote'
                    }));
                }
                
                toast.success('Downvoted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    icon: <FiThumbsDown />,
                    style: {
                        background: 'rgba(239, 68, 68, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to downvote. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while voting. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            // Clear voting in progress
            setVotingInProgress(prev => ({ ...prev, [`${id}-downvote`]: false }));
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to update status', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setStatusUpdateInProgress(true);
        try {
            // Map frontend status to backend format
            const backendStatus = mapStatusToBackend(newStatus);
            const result = await dispatch(updateComplaintStatus({ complaintId: id, status: backendStatus }));
            if (updateComplaintStatus.fulfilled.match(result)) {
                toast.success(`Status updated to ${newStatus.replace('-', ' ')}!`, {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
            } else {
                toast.error('❌ Failed to update status. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while updating status. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setStatusUpdateInProgress(false);
        }
    };

    const handleDeleteComplaint = async () => {
        if (!isAuthenticated) {
            toast.error('🔐 Please log in to delete complaint', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
            return;
        }

        setDeleteInProgress(true);
        try {
            const result = await dispatch(deleteComplaint(id));
            if (deleteComplaint.fulfilled.match(result)) {
                toast.success('Complaint deleted successfully!', {
                    duration: 2000,
                    position: 'top-center',
                    className: 'custom-toast custom-toast-success',
                    style: {
                        background: 'rgba(34, 197, 94, 0.2)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#fff',
                        fontWeight: '600',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                });
                navigate('/complain?tab=view');
            } else {
                toast.error('❌ Failed to delete complaint. Please try again.', {
                    duration: 3000,
                    position: 'top-center',
                });
            }
        } catch (error) {
            toast.error('❌ Error while deleting complaint. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setDeleteInProgress(false);
        }
    };

    const handleAcceptComplaint = async () => {
        if (!isAuthenticated || user?.role !== 'officer') {
            toast.error('🔐 Only officers can accept complaints', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        if (!user || !user._id) {
            toast.error('User information not available');
            return;
        }

        setAssignmentInProgress(true);
        try {
            // Show loading toast
            const loadingToast = toast.loading('Accepting complaint...');
            
            // Use Redux thunk to accept complaint
            const acceptResult = await dispatch(acceptComplaint({ 
                complaintId: id, 
                officerId: user._id 
            }));

            if (acceptComplaint.fulfilled.match(acceptResult)) {
                // Officer accepted complaint - complaint stays at level 1
                console.log('✅ Complaint accepted by officer:', id);
                
                // Dismiss loading and show success
                toast.dismiss(loadingToast);
                toast.success('✅ Complaint accepted! You are now assigned to this case.', {
                    duration: 4000,
                    position: 'top-center',
                    icon: '✅'
                });

                // Refresh complaint details to show updated assigned_officer_id
                dispatch(fetchComplaintById(id));
                
                console.log('✅ Complaint accepted:', id);
            } else {
                toast.dismiss(loadingToast);
                throw new Error(acceptResult.payload || 'Failed to accept complaint');
            }
        } catch (error) {
            console.error('Error accepting complaint:', error);
            toast.error('❌ Error while accepting complaint. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
        } finally {
            setAssignmentInProgress(false);
        }
    };

    const handleIgnoreComplaint = async () => {
        if (!isAuthenticated || user?.role !== 'officer') {
            toast.error('🔐 Only officers can ignore complaints', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        try {
            // Show loading toast
            const loadingToast = toast.loading('Rejecting complaint...');
            
            // Use Redux thunk to reject complaint
            const result = await dispatch(rejectComplaint(id));
            
            // Dismiss loading toast
            toast.dismiss(loadingToast);

            if (rejectComplaint.fulfilled.match(result)) {
                // Show success toast
                toast.success('Complaint rejected successfully', {
                    duration: 2000,
                    position: 'top-center',
                });
                
                // Set the complaint as ignored to show disclaimer
                setComplaintIgnored(true);
                
                console.log('✅ Complaint rejected:', id);
            } else {
                throw new Error(result.payload || 'Failed to reject complaint');
            }
        } catch (error) {
            console.error('Error rejecting complaint:', error);
            toast.error(error.message || '❌ Failed to reject complaint', {
                duration: 3000,
                position: 'top-center',
            });
        }
    };

    const openCommentModal = () => {
        setCommentModalOpen(true);
        // Comments are already fetched on component mount, but refresh them for the modal
        dispatch(fetchComments(id));
    };

    const closeCommentModal = () => {
        setCommentModalOpen(false);
    };

    // Handler functions for CommentModal component
    const handleCommentSubmit = async (commentData) => {
        try {
            const result = await dispatch(addComment({
                complaintId: commentData.complaintId,
                content: commentData.content,
                rating: commentData.rating
            }));

            if (addComment.fulfilled.match(result)) {
                // Fetch updated comments to refresh the comment list
                await dispatch(fetchComments(id));
                return true;
            } else {
                throw new Error(result.payload || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    };

    const handleCommentUpdate = async (commentId, updateData) => {
        try {
            const result = await dispatch(updateComment({
                commentId,
                comment: updateData.comment,
                rating: updateData.rating
            }));

            if (updateComment.fulfilled.match(result)) {
                // Fetch updated comments
                await dispatch(fetchComments(id));
                return true;
            } else {
                throw new Error(result.payload || 'Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    };

    const handleCommentDelete = async (commentId) => {
        try {
            const result = await dispatch(removeComment(commentId));

            if (removeComment.fulfilled.match(result)) {
                // Fetch updated comments to refresh the comment list
                await dispatch(fetchComments(id));
                return true;
            } else {
                throw new Error(result.payload || 'Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    };

    if (isLoading) {
        return (
            <>
                <Navbar />
                <div className="cd-page-wrapper">
                    <div className="cd-main-container">
                        <div className="cd-loading-wrapper">
                            <div className="cd-loading-animation"></div>
                            <p className="cd-loading-message">Loading complaint details...</p>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (error && !selectedComplaint) {
        return (
            <>
                <Navbar />
                <div className="cd-page-wrapper">
                    <div className="cd-main-container">
                        <div className="cd-error-wrapper">
                            <FiAlertTriangle className="cd-error-icon" />
                            <h2>Complaint Not Found</h2>
                            <p>The complaint you're looking for doesn't exist or has been removed.</p>
                            <button 
                                className="cd-primary-btn"
                                onClick={() => navigate('/complain?tab=view')}
                            >
                                <FiArrowLeft /> Back to Complaints
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (!selectedComplaint) {
        return (
            <>
                <Navbar />
                <div className="cd-page-wrapper">
                    <div className="cd-main-container">
                        <div className="cd-error-wrapper">
                            <FiAlertTriangle className="cd-error-icon" />
                            <h2>No Complaint Data</h2>
                            <p>Unable to load complaint details. Please try again.</p>
                            <button 
                                className="cd-primary-btn"
                                onClick={() => navigate('/complain?tab=view')}
                            >
                                <FiArrowLeft /> Back to Complaints
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const severityInfo = getSeverityInfo(selectedComplaint.severity);
    const canEdit = isAuthenticated && user && (user._id === selectedComplaint.userId || user.role === 'admin');

    return (
        <>
            <Navbar />
            <div className="cd-page-wrapper">
                <div className="cd-main-container">
                    {/* Header with back button */}
                    <div className="cd-header-section">
                        <button 
                            className="cd-nav-back-btn"
                            onClick={() => navigate('/complain?tab=view')}
                        >
                            <FiArrowLeft /> Back to Complaints
                        </button>
                        
                        {canEdit && (
                            <div className="cd-header-actions">
                                <button 
                                    className="cd-edit-action-btn"
                                    onClick={() => navigate(`/complain?edit=${id}`)}
                                    disabled={deleteInProgress}
                                >
                                    <FiEdit3 /> Edit
                                </button>
                                <button 
                                    className="cd-delete-action-btn"
                                    onClick={handleDeleteComplaint}
                                    disabled={deleteInProgress}
                                >
                                    {deleteInProgress ? (
                                        <div className="cd-loading-spinner-small"></div>
                                    ) : (
                                        <><FiTrash2 /> Delete</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Officer Assignment Section - Show Accept/Ignore buttons for officers on unassigned complaints */}
                    {isAuthenticated && user?.role === 'officer' && !selectedComplaint.assigned_officer_id && (
                        <motion.div 
                            className="cd-officer-assignment-section"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {!complaintIgnored ? (
                                <>
                                    <div className="cd-assignment-header">
                                        <FiAlertTriangle className="cd-assignment-icon" />
                                        <h3>Unassigned complaint - Take action</h3>
                                    </div>
                                    <div className="cd-assignment-actions">
                                        <button
                                            className="cd-accept-btn"
                                            onClick={handleAcceptComplaint}
                                            disabled={assignmentInProgress}
                                        >
                                            {assignmentInProgress ? (
                                                <div className="cd-loading-spinner-small"></div>
                                            ) : (
                                                <>
                                                    <FiCheckCircle /> Accept
                                                </>
                                            )}
                                        </button>
                                        <button
                                            className="cd-ignore-btn"
                                            onClick={handleIgnoreComplaint}
                                            disabled={assignmentInProgress}
                                        >
                                            <FiArrowLeft /> Ignore
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="cd-ignored-disclaimer">
                                    <FiCheckCircle className="cd-ignored-icon" />
                                    <div className="cd-ignored-text">
                                        <h3>You have ignored this complaint</h3>
                                        <p>This complaint will not appear in your queue anymore.</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Main complaint card */}
                    <div className="cd-primary-card">
                        {/* Card Header */}
                        <div className="cd-card-header-wrapper">
                            <div className="cd-header-top-row">
                                <div className="cd-header-left-section">
                                    <div className="cd-category-display">
                                        <span 
                                            className="cd-category-icon-wrapper" 
                                            style={{ backgroundColor: getCategoryColor(selectedComplaint.category) }}
                                        >
                                            {getCategoryIcon(selectedComplaint.category)}
                                        </span>
                                        <span className="cd-category-label-text">
                                            {getCategoryLabel(selectedComplaint.category)}
                                        </span>
                                    </div>
                                    <div className="cd-severity-display">
                                        <span className={`cd-severity-indicator ${severityInfo.class}`}>
                                            {severityInfo.icon} {severityInfo.label}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="cd-header-right-section">
                                    <span className={`cd-status-indicator ${getStatusBadgeClass(mapStatusToFrontend(selectedComplaint.status))}`}>
                                        {mapStatusToFrontend(selectedComplaint.status)?.replace('-', ' ').toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Escalation Badge */}
                            <div className="cd-escalation-section">
                                <EscalationBadge 
                                    complaint={selectedComplaint} 
                                    showTimer={true} 
                                    showProgress={true}
                                    size="large"
                                />
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="cd-content-body">
                            <div className="cd-title-wrapper">
                                <h1 className="cd-main-title">
                                    {selectedComplaint.title}
                                </h1>
                            </div>
                            
                            <div className="cd-description-wrapper">
                                <h3>Description</h3>
                                <p className="cd-description-content">
                                    {selectedComplaint.description}
                                </p>
                            </div>

                            {/* Metadata */}
                            <div className="cd-metadata-wrapper">
                                {/* User Information Section */}
                                <div className="cd-user-info-section">
                                    <div className="cd-user-card">
                                        {safeGet(selectedComplaint, 'user_id.profileImage') && (
                                            <motion.img
                                                src={safeGet(selectedComplaint, 'user_id.profileImage')}
                                                alt={safeGet(selectedComplaint, 'user_id.name') || 'User'}
                                                className="cd-user-avatar-large"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.4, delay: 0.2 }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <div className="cd-user-info-details">
                                            <div className="cd-user-info-header">
                                                <FiUser className="cd-user-info-icon" />
                                                <span className="cd-user-info-label">Submitted by</span>
                                            </div>
                                            <div className="cd-user-name-large">
                                                {safeGet(selectedComplaint, 'user_id.name') || selectedComplaint.userName || 'Anonymous'}
                                            </div>
                                            {safeGet(selectedComplaint, 'user_id.email') && (
                                                <div className="cd-user-email">
                                                    {safeGet(selectedComplaint, 'user_id.email')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Timestamps Section */}
                                <div className="cd-timestamps-section">
                                    <div className="cd-timestamp-item">
                                        <FiCalendar className="cd-metadata-icon" />
                                        <div className="cd-timestamp-content">
                                            <span className="cd-timestamp-label">Created</span>
                                            <span className="cd-timestamp-value">{formatDate(selectedComplaint.createdAt)}</span>
                                        </div>
                                    </div>
                                    
                                    {selectedComplaint.updatedAt !== selectedComplaint.createdAt && (
                                        <div className="cd-timestamp-item">
                                            <FiCalendar className="cd-metadata-icon" />
                                            <div className="cd-timestamp-content">
                                                <span className="cd-timestamp-label">Last updated</span>
                                                <span className="cd-timestamp-value">{formatDate(selectedComplaint.updatedAt)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Location Section */}
                                {selectedComplaint.location && (
                                    <div className="cd-location-section">
                                        <div className="cd-location-item">
                                            <FiMapPin className="cd-metadata-icon" />
                                            <div className="cd-location-content">
                                                <span className="cd-location-label">Location</span>
                                                <span className="cd-location-value">
                                                    {selectedComplaint.address || 
                                                    (selectedComplaint.location.coordinates ? 
                                                        `${selectedComplaint.location.coordinates[1]?.toFixed(6)}, ${selectedComplaint.location.coordinates[0]?.toFixed(6)}` :
                                                        `${selectedComplaint.location.latitude?.toFixed(6)}, ${selectedComplaint.location.longitude?.toFixed(6)}`)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Train Number (if applicable) */}
                                {selectedComplaint.trainNumber && (
                                    <div className="cd-train-section">
                                        <div className="cd-train-item">
                                            <MdTrain className="cd-metadata-icon" />
                                            <div className="cd-train-content">
                                                <span className="cd-train-label">Train Number</span>
                                                <span className="cd-train-value">{selectedComplaint.trainNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Rail-Specific Information Section */}
                            {selectedComplaint.category === 'rail' && selectedComplaint.category_specific_data && (
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="cd-rail-info-wrapper"
                                >
                                    <motion.h3
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.6, delay: 0.2 }}
                                    >
                                        Train Information
                                    </motion.h3>
                                    
                                    {/* Basic Train Info Cards */}
                                    <div className="cd-rail-basic-info">
                                        {safeGet(selectedComplaint, 'category_specific_data.train_name') && (
                                            <TrainInfoCard
                                                icon={<MdTrain />}
                                                label="Train Name"
                                                value={safeGet(selectedComplaint, 'category_specific_data.train_name')}
                                                color="#f59e0b"
                                                delay={0.1}
                                            />
                                        )}
                                        
                                        {safeGet(selectedComplaint, 'category_specific_data.train_number') && (
                                            <TrainInfoCard
                                                icon={<FiInfo />}
                                                label="Train Number"
                                                value={safeGet(selectedComplaint, 'category_specific_data.train_number')}
                                                color="#3b82f6"
                                                delay={0.2}
                                            />
                                        )}
                                        
                                        {safeGet(selectedComplaint, 'category_specific_data.train_type') && (
                                            <TrainInfoCard
                                                icon={<MdDirectionsTransit />}
                                                label="Train Type"
                                                value={formatTrainType(safeGet(selectedComplaint, 'category_specific_data.train_type'))}
                                                color="#8b5cf6"
                                                delay={0.3}
                                            />
                                        )}
                                        
                                        {safeGet(selectedComplaint, 'category_specific_data.operator_zone') && (
                                            <TrainInfoCard
                                                icon={<FiInfo />}
                                                label="Operator Zone"
                                                value={safeGet(selectedComplaint, 'category_specific_data.operator_zone')}
                                                color="#10b981"
                                                delay={0.4}
                                            />
                                        )}
                                        
                                        {safeGet(selectedComplaint, 'category_specific_data.coaches') && 
                                         Object.keys(safeGet(selectedComplaint, 'category_specific_data.coaches')).length > 0 && (
                                            <TrainInfoCard
                                                icon={<MdDirectionsRailway />}
                                                label="Total Coaches"
                                                value={Object.keys(safeGet(selectedComplaint, 'category_specific_data.coaches')).length}
                                                color="#f59e0b"
                                                delay={0.5}
                                            />
                                        )}
                                    </div>

                                    {/* Journey Summary */}
                                    {safeGet(selectedComplaint, 'category_specific_data.stations') && (
                                        <TrainJourneySummary 
                                            stations={safeGet(selectedComplaint, 'category_specific_data.stations')} 
                                        />
                                    )}

                                    {/* Route Timeline */}
                                    {safeGet(selectedComplaint, 'category_specific_data.routes.from_station') && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.6, delay: 0.5 }}
                                            className="cd-rail-section"
                                        >
                                            <h4 className="cd-rail-section-title">
                                                <FiNavigation /> Route Information
                                            </h4>
                                            <RailRouteTimeline
                                                fromStation={safeGet(selectedComplaint, 'category_specific_data.routes.from_station')}
                                                toStation={safeGet(selectedComplaint, 'category_specific_data.routes.to_station')}
                                                totalDistance={safeGet(selectedComplaint, 'category_specific_data.total_distance')}
                                                stations={safeGet(selectedComplaint, 'category_specific_data.stations')}
                                            />
                                        </motion.div>
                                    )}

                                    {/* Performance Metrics */}
                                    <div className="cd-rail-metrics">
                                        {safeGet(selectedComplaint, 'category_specific_data.avg_speed') && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.6, delay: 0.6 }}
                                                className="cd-rail-section"
                                            >
                                                <h4 className="cd-rail-section-title">
                                                    <MdSpeed /> Average Speed
                                                </h4>
                                                <RailSpeedGauge speed={safeGet(selectedComplaint, 'category_specific_data.avg_speed')} />
                                            </motion.div>
                                        )}

                                        {safeGet(selectedComplaint, 'category_specific_data.frequency') && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.6, delay: 0.7 }}
                                                className="cd-rail-section"
                                            >
                                                <h4 className="cd-rail-section-title">
                                                    <MdAccessTime /> Running Schedule
                                                </h4>
                                                <RailFrequencyChart frequency={safeGet(selectedComplaint, 'category_specific_data.frequency')} />
                                                <p className="cd-frequency-summary">
                                                    Running Days: {formatFrequency(safeGet(selectedComplaint, 'category_specific_data.frequency'))}
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Voting and Actions */}
                            <div className="cd-interactions-wrapper">
                                <div className="cd-voting-controls">
                                    <button
                                        className={`cd-vote-button cd-upvote-button ${selectedComplaint.userVote === 'upvote' ? 'cd-voted' : ''}`}
                                        onClick={handleUpvote}
                                        disabled={votingInProgress[`${id}-upvote`] || votingInProgress[`${id}-downvote`]}
                                        title="Upvote this complaint"
                                    >
                                        <FiThumbsUp />
                                        <span>{selectedComplaint.upvote || 0}</span>
                                    </button>
                                    
                                    <button
                                        className={`cd-vote-button cd-downvote-button ${selectedComplaint.userVote === 'downvote' ? 'cd-voted' : ''}`}
                                        onClick={handleDownvote}
                                        disabled={votingInProgress[`${id}-upvote`] || votingInProgress[`${id}-downvote`]}
                                        title="Downvote this complaint"
                                    >
                                        <FiThumbsDown />
                                        <span>{selectedComplaint.downvote || 0}</span>
                                    </button>
                                </div>

                                <div className="cd-utility-buttons">
                                    <button
                                        className="cd-comments-btn"
                                        onClick={openCommentModal}
                                    >
                                        <FiMessageCircle />
                                        Comments ({selectedComplaint.commentCount || 0})
                                    </button>
                                </div>
                            </div>

                            {/* Location Map */}
                            {(() => {
                                const coordinates = getCoordinates(selectedComplaint);
                                return coordinates && (
                                    <div className="cd-location-map-wrapper">
                                        <h3>Complaint Location</h3>
                                        <div className="cd-map-container">
                                            <MapContainer
                                                center={coordinates}
                                                zoom={15}
                                                style={{ height: '300px', width: '100%', borderRadius: '12px' }}
                                            >
                                                <TileLayer
                                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />
                                                <Marker position={coordinates}>
                                                    <Popup>
                                                        <div style={{ textAlign: 'center', minWidth: '200px' }}>
                                                            <strong>{selectedComplaint.title}</strong>
                                                            <br />
                                                            <span style={{ fontSize: '12px', color: '#666' }}>
                                                                {selectedComplaint.address || `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`}
                                                            </span>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            </MapContainer>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Escalation Timeline Section */}
                            {selectedComplaint.escalation_id && (
                                <div className="cd-escalation-timeline-section">
                                    <EscalationTimeline 
                                        escalationHistory={selectedComplaint.escalation_id?.history || []} 
                                    />
                                </div>
                            )}

                            {/* Progress & Evidence Section */}
                            <ComplaintProgress 
                                complaintId={selectedComplaint._id}
                                category={selectedComplaint.category}
                                currentUser={user}
                                isOfficer={user?.role === 'officer'}
                            />

                            {/* Status Update Section (for admins or complaint owner) */}
                            {canEdit && (
                                <div className="cd-status-management">
                                    <h3>Update Status</h3>
                                    <div className="cd-status-controls">
                                        {['pending', 'in-progress', 'resolved', 'rejected'].map((status) => (
                                            <button
                                                key={status}
                                                className={`cd-status-option-btn ${mapStatusToFrontend(selectedComplaint.status) === status ? 'cd-active-status' : ''}`}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={statusUpdateInProgress}
                                            >
                                                {status.replace('-', ' ').toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comment Modal */}
                {commentModalOpen && (
                    <CommentModal
                        complaintId={selectedComplaint._id}
                        complaintTitle={selectedComplaint.title}
                        complaintCategory={selectedComplaint.category}
                        complaintType={selectedComplaint.category}
                        isOpen={commentModalOpen}
                        comments={selectedComplaint.comments || []}
                        totalComments={selectedComplaint.commentCount || 0}
                        onClose={closeCommentModal}
                        onCommentSubmit={handleCommentSubmit}
                        onCommentUpdate={handleCommentUpdate}
                        onCommentDelete={handleCommentDelete}
                    />
                )}
            </div>
            <Footer />
            <Toaster 
                position="top-center"
                containerStyle={{
                    top: '120px', // Account for navbar
                }}
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        padding: '16px 20px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    },
                }}
            />
        </>
    );
}