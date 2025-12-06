import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDepartmentDetails } from '../auth/redux/departmentSlice';
import Navbar from '../Navbar';
import Footer from '../Footer';
import 'leaflet/dist/leaflet.css';
import './OfficerDepartment.css';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Doughnut, Bar, Line, Radar, Pie } from 'react-chartjs-2';
import * as d3 from 'd3';
import {
    FaBuilding,
    FaChartBar,
    FaUsers,
    FaExclamationTriangle,
    FaCheckCircle,
    FaClock,
    FaFire,
    FaSearch,
    FaTimes,
    FaSpinner
} from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, RadialLinearScale, Filler);

const OfficerDepartment = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { departmentDetails, loading, error } = useSelector((state) => state.department);
    const [selectedView, setSelectedView] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredComplaints, setFilteredComplaints] = useState([]);
    const heatmapRef = useRef(null);
    const mapRef = useRef(null);
    const trendlineRef = useRef(null);
    const severityMapRef = useRef(null);

    useEffect(() => {
        if (user?.department_id) {
            dispatch(fetchDepartmentDetails(user.department_id));
        }
    }, [dispatch, user?.department_id]);

    // Leaflet Map for complaint distribution heatmap
    useEffect(() => {
        if (departmentDetails && heatmapRef.current && selectedView === 'heatmap') {
            initializeHeatmap();
        }
    }, [departmentDetails, selectedView]);

    // D3.js Timeline
    useEffect(() => {
        if (departmentDetails && trendlineRef.current && selectedView === 'timeline') {
            drawTimeline();
        }
    }, [departmentDetails, selectedView]);

    const drawHeatmap = () => {
        const container = d3.select(heatmapRef.current);
        container.selectAll('*').remove();

        const margin = { top: 50, right: 50, bottom: 100, left: 100 };
        const width = 800 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = container
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const statuses = ['pending', 'in_progress', 'resolved', 'rejected'];
        const severities = ['low', 'medium', 'high'];

        const data = [];
        statuses.forEach(status => {
            severities.forEach(severity => {
                const statusCount = departmentDetails.statistics.by_status[status] || 0;
                const severityCount = departmentDetails.statistics.by_severity[severity] || 0;
                data.push({
                    status,
                    severity,
                    value: Math.floor((statusCount + severityCount) / 2)
                });
            });
        });

        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(statuses)
            .padding(0.05);

        const yScale = d3.scaleBand()
            .range([height, 0])
            .domain(severities)
            .padding(0.05);

        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateYlOrRd)
            .domain([0, d3.max(data, d => d.value)]);

        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)')
            .style('fill', '#fff')
            .style('font-size', '12px');

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', '#fff')
            .style('font-size', '12px');

        // Add cells
        svg.selectAll()
            .data(data)
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.status))
            .attr('y', d => yScale(d.severity))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .style('fill', d => colorScale(d.value))
            .style('stroke', 'white')
            .style('stroke-width', 2)
            .style('opacity', 0.8)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .style('opacity', 1)
                    .style('stroke-width', 4);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('opacity', 0.8)
                    .style('stroke-width', 2);
            });

        // Add values
        svg.selectAll()
            .data(data)
            .enter()
            .append('text')
            .attr('x', d => xScale(d.status) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.severity) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .text(d => d.value)
            .style('fill', '#fff')
            .style('font-weight', 'bold')
            .style('font-size', '16px');

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text('Complaint Distribution Heatmap');
    };

    const initializeHeatmap = async () => {
        try {
            const L = (await import("leaflet")).default;
            await import("leaflet.heat");
            
            // Clean up existing map
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            // Get complaints with valid coordinates
            const complaintsWithCoords = departmentDetails.complaints.filter(complaint => {
                const lat = complaint.location?.coordinates?.[1] ?? complaint.latitude;
                const lng = complaint.location?.coordinates?.[0] ?? complaint.longitude;
                return lat && lng && !isNaN(lat) && !isNaN(lng);
            });

            if (complaintsWithCoords.length === 0) {
                heatmapRef.current.innerHTML = '<div style="color: white; text-align: center; padding: 2rem;">No complaints with location data available</div>';
                return;
            }

            // Calculate center point
            const avgLat = complaintsWithCoords.reduce((sum, c) => {
                const lat = c.location?.coordinates?.[1] ?? c.latitude;
                return sum + parseFloat(lat);
            }, 0) / complaintsWithCoords.length;

            const avgLng = complaintsWithCoords.reduce((sum, c) => {
                const lng = c.location?.coordinates?.[0] ?? c.longitude;
                return sum + parseFloat(lng);
            }, 0) / complaintsWithCoords.length;

            // Initialize map
            const map = L.map(heatmapRef.current).setView([avgLat, avgLng], 12);
            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            // Prepare heatmap data with intensity based on severity
            const heatData = complaintsWithCoords.map(complaint => {
                const lat = complaint.location?.coordinates?.[1] ?? complaint.latitude;
                const lng = complaint.location?.coordinates?.[0] ?? complaint.longitude;
                
                // Intensity based on severity
                let intensity = 0.3;
                if (complaint.severity === 'medium') intensity = 0.6;
                if (complaint.severity === 'high') intensity = 1.0;
                
                return [parseFloat(lat), parseFloat(lng), intensity];
            });

            // Add heatmap layer
            L.heatLayer(heatData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                max: 1.0,
                gradient: {
                    0.0: '#4caf50',
                    0.5: '#ffc107',
                    1.0: '#f44336'
                }
            }).addTo(map);

            // Add markers for individual complaints
            complaintsWithCoords.forEach(complaint => {
                const lat = complaint.location?.coordinates?.[1] ?? complaint.latitude;
                const lng = complaint.location?.coordinates?.[0] ?? complaint.longitude;

                const severityColor = 
                    complaint.severity === 'high' ? '#f44336' :
                    complaint.severity === 'medium' ? '#ffc107' : '#4caf50';

                const markerIcon = L.divIcon({
                    html: `<div style="background: ${severityColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                    className: 'custom-marker',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                const marker = L.marker([parseFloat(lat), parseFloat(lng)], { icon: markerIcon }).addTo(map);

                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: #333;">${complaint.title}</h4>
                        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${complaint.status.replace('_', ' ')}</p>
                        <p style="margin: 4px 0; font-size: 12px;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${complaint.severity.toUpperCase()}</span></p>
                        <p style="margin: 4px 0; font-size: 12px;"><strong>Level:</strong> ${complaint.level}</p>
                        ${complaint.address ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Location:</strong> ${complaint.address}</p>` : ''}
                        <p style="margin: 4px 0; font-size: 11px; color: #666;">${new Date(complaint.createdAt).toLocaleDateString()}</p>
                    </div>
                `);
            });

            // Add legend
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function() {
                const div = L.DomUtil.create('div', 'leaflet-heatmap-legend');
                div.innerHTML = `
                    <div style="background: rgba(255, 255, 255, 0.95); padding: 12px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Complaint Density</h4>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 20px; height: 20px; background: #4caf50; border-radius: 3px;"></div>
                                <span style="font-size: 12px; color: #333;">Low Severity</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 20px; height: 20px; background: #ffc107; border-radius: 3px;"></div>
                                <span style="font-size: 12px; color: #333;">Medium Severity</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 20px; height: 20px; background: #f44336; border-radius: 3px;"></div>
                                <span style="font-size: 12px; color: #333;">High Severity</span>
                            </div>
                        </div>
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #666;">Total: ${complaintsWithCoords.length} complaints</p>
                    </div>
                `;
                return div;
            };
            legend.addTo(map);

            // Force map to resize properly
            setTimeout(() => {
                map.invalidateSize();
            }, 100);

        } catch (error) {
            console.error('Error initializing heatmap:', error);
            heatmapRef.current.innerHTML = '<div style="color: white; text-align: center; padding: 2rem;">Error loading map</div>';
        }
    };

    const drawTimeline = () => {
        const container = d3.select(trendlineRef.current);
        container.selectAll('*').remove();

        const margin = { top: 50, right: 50, bottom: 70, left: 70 };
        const width = 900 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = container
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const recentComplaints = departmentDetails.statistics.recent_complaints || [];
        
        // Process data by date
        const complaintsByDate = d3.rollup(
            recentComplaints,
            v => v.length,
            d => new Date(d.createdAt).toLocaleDateString()
        );

        const data = Array.from(complaintsByDate, ([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(data.map(d => d.date))
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data, d => d.count) + 1]);

        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('fill', '#fff')
            .style('font-size', '11px');

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', '#fff')
            .style('font-size', '12px');

        // Add bars
        svg.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.date))
            .attr('y', d => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.count))
            .attr('fill', 'url(#gradient)')
            .attr('rx', 5)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('opacity', 0.8);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('opacity', 1);
            });

        // Add gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'gradient')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#00ADB5')
            .attr('stop-opacity', 1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#71C9CE')
            .attr('stop-opacity', 1);

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text('Recent Complaints Timeline');
    };

    if (loading) {
        return (
            <div className="officer-department-loading">
                <div className="loading-spinner"></div>
                <p>Loading department details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="officer-department-error">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3>Error Loading Department Details</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!departmentDetails) {
        return (
            <div className="officer-department-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3>No Department Information</h3>
                <p>Unable to load department details</p>
            </div>
        );
    }

    const { department, statistics, complaints, officers } = departmentDetails;

    // Chart.js data configurations
    const statusChartData = {
        labels: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
        datasets: [{
            label: 'Complaints by Status',
            data: [
                statistics.by_status.pending,
                statistics.by_status.in_progress,
                statistics.by_status.resolved,
                statistics.by_status.rejected
            ],
            backgroundColor: [
                'rgba(255, 193, 7, 0.8)',
                'rgba(3, 169, 244, 0.8)',
                'rgba(76, 175, 80, 0.8)',
                'rgba(244, 67, 54, 0.8)'
            ],
            borderColor: [
                'rgba(255, 193, 7, 1)',
                'rgba(3, 169, 244, 1)',
                'rgba(76, 175, 80, 1)',
                'rgba(244, 67, 54, 1)'
            ],
            borderWidth: 2
        }]
    };

    const severityChartData = {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
            label: 'Complaints by Severity',
            data: [
                statistics.by_severity.low,
                statistics.by_severity.medium,
                statistics.by_severity.high
            ],
            backgroundColor: [
                'rgba(76, 175, 80, 0.8)',
                'rgba(255, 193, 7, 0.8)',
                'rgba(244, 67, 54, 0.8)'
            ],
            borderColor: [
                'rgba(76, 175, 80, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(244, 67, 54, 1)'
            ],
            borderWidth: 2
        }]
    };

    const levelChartData = {
        labels: Object.keys(statistics.by_level).map(k => k.replace('level_', 'Level ')),
        datasets: [{
            label: 'Complaints by Level',
            data: Object.values(statistics.by_level),
            backgroundColor: 'rgba(0, 173, 181, 0.7)',
            borderColor: 'rgba(0, 173, 181, 1)',
            borderWidth: 2,
            borderRadius: 8
        }]
    };

    const officerStatsData = {
        labels: officers.slice(0, 10).map(o => o.name),
        datasets: [
            {
                label: 'Pending',
                data: officers.slice(0, 10).map(o => o.pending_complaints),
                backgroundColor: 'rgba(255, 193, 7, 0.7)'
            },
            {
                label: 'In Progress',
                data: officers.slice(0, 10).map(o => o.in_progress_complaints),
                backgroundColor: 'rgba(3, 169, 244, 0.7)'
            },
            {
                label: 'Resolved',
                data: officers.slice(0, 10).map(o => o.resolved_complaints),
                backgroundColor: 'rgba(76, 175, 80, 0.7)'
            },
            {
                label: 'Rejected',
                data: officers.slice(0, 10).map(o => o.rejected_complaints),
                backgroundColor: 'rgba(244, 67, 54, 0.7)'
            }
        ]
    };

    const radarData = {
        labels: ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Active'],
        datasets: [{
            label: 'Department Performance',
            data: [
                statistics.by_status.pending,
                statistics.by_status.in_progress,
                statistics.by_status.resolved,
                statistics.by_status.rejected,
                statistics.active_complaints
            ],
            backgroundColor: 'rgba(0, 173, 181, 0.2)',
            borderColor: 'rgba(0, 173, 181, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(0, 173, 181, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(0, 173, 181, 1)'
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#fff',
                    font: { size: 12 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff'
            }
        }
    };

    const barChartOptions = {
        ...chartOptions,
        scales: {
            x: {
                ticks: { color: '#fff' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: { color: '#fff' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };

    return (
        <>
            <Navbar />
            <div className="officer-dept-dashboard">
                {/* Header */}
                <div className="officer-dept-header">
                <div className="officer-dept-header-content">
                    <div className="officer-dept-header-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="officer-dept-title">{department.name}</h1>
                        <p className="officer-dept-subtitle">
                            {department.category.toUpperCase()} Department - {department.jurisdiction_level} Level
                        </p>
                    </div>
                </div>
                <div className="officer-dept-contact">
                    <div className="officer-dept-contact-item">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{department.contact_email}</span>
                    </div>
                    {department.contact_phone && (
                        <div className="officer-dept-contact-item">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{department.contact_phone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="officer-dept-metrics">
                <div className="officer-dept-metric-card">
                    <div className="officer-dept-metric-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="officer-dept-metric-details">
                        <h3>{statistics.total_complaints}</h3>
                        <p>Total Complaints</p>
                    </div>
                </div>

                <div className="officer-dept-metric-card">
                    <div className="officer-dept-metric-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="officer-dept-metric-details">
                        <h3>{statistics.active_complaints}</h3>
                        <p>Active Complaints</p>
                    </div>
                </div>

                <div className="officer-dept-metric-card">
                    <div className="officer-dept-metric-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div className="officer-dept-metric-details">
                        <h3>{departmentDetails.total_officers}</h3>
                        <p>Total Officers</p>
                    </div>
                </div>

                <div className="officer-dept-metric-card">
                    <div className="officer-dept-metric-icon" style={{background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="officer-dept-metric-details">
                        <h3>{statistics.by_status.resolved}</h3>
                        <p>Resolved Cases</p>
                    </div>
                </div>

                <div className="officer-dept-metric-card">
                    <div className="officer-dept-metric-icon" style={{background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                    </div>
                    <div className="officer-dept-metric-details">
                        <h3>{statistics.avg_upvotes}</h3>
                        <p>Avg Upvotes</p>
                    </div>
                </div>

                <div className="officer-dept-metric-card">
                    <div className="officer-dept-metric-icon" style={{background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="officer-dept-metric-details">
                        <h3>{statistics.by_status.pending}</h3>
                        <p>Pending Cases</p>
                    </div>
                </div>
            </div>

            {/* View Selector */}
            <div className="officer-dept-view-selector">
                <button 
                    className={selectedView === 'overview' ? 'officer-dept-view-active' : ''} 
                    onClick={() => setSelectedView('overview')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Overview Charts
                </button>
                <button 
                    className={selectedView === 'heatmap' ? 'officer-dept-view-active' : ''} 
                    onClick={() => setSelectedView('heatmap')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Geographic Heatmap
                </button>
                <button 
                    className={selectedView === 'timeline' ? 'officer-dept-view-active' : ''} 
                    onClick={() => setSelectedView('timeline')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Timeline View
                </button>
                <button 
                    className={selectedView === 'officers' ? 'officer-dept-view-active' : ''} 
                    onClick={() => setSelectedView('officers')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Officers Performance
                </button>
            </div>

            {/* Charts Grid - Overview */}
            {selectedView === 'overview' && (
                <div className="officer-dept-charts-grid">
                    <div className="officer-dept-chart-container">
                        <h3 className="officer-dept-chart-title">Status Distribution</h3>
                        <div className="officer-dept-chart-wrapper">
                            <Doughnut data={statusChartData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="officer-dept-chart-container">
                        <h3 className="officer-dept-chart-title">Severity Breakdown</h3>
                        <div className="officer-dept-chart-wrapper">
                            <Pie data={severityChartData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="officer-dept-chart-container full-width">
                        <h3 className="officer-dept-chart-title">Complaints by Escalation Level</h3>
                        <div className="officer-dept-chart-wrapper">
                            <Bar data={levelChartData} options={barChartOptions} />
                        </div>
                    </div>

                    <div className="officer-dept-chart-container">
                        <h3 className="officer-dept-chart-title">Department Performance Radar</h3>
                        <div className="officer-dept-chart-wrapper">
                            <Radar data={radarData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="officer-dept-chart-container">
                        <h3 className="officer-dept-chart-title">Top 10 Officers - Complaint Load</h3>
                        <div className="officer-dept-chart-wrapper">
                            <Bar data={officerStatsData} options={barChartOptions} />
                        </div>
                    </div>
                </div>
            )}

            {/* Leaflet Heatmap View */}
            {selectedView === 'heatmap' && (
                <div className="officer-dept-map-visualization">
                    <h3 className="officer-dept-section-title">Geographic Complaint Distribution</h3>
                    <div ref={heatmapRef} className="officer-dept-leaflet-map"></div>
                </div>
            )}

            {/* D3.js Timeline View */}
            {selectedView === 'timeline' && (
                <div className="officer-dept-d3-visualization">
                    <div ref={trendlineRef} className="officer-dept-d3-container"></div>
                </div>
            )}

            {/* Officers Performance Table */}
            {selectedView === 'officers' && (
                <div className="officer-dept-officers-table-container">
                    <h3 className="officer-dept-section-title">Officers Performance Overview</h3>
                    <div className="officer-dept-officers-table-wrapper">
                        <table className="officer-dept-officers-table">
                            <thead>
                                <tr>
                                    <th>Officer</th>
                                    <th>Level</th>
                                    <th>Total</th>
                                    <th>Pending</th>
                                    <th>In Progress</th>
                                    <th>Resolved</th>
                                    <th>Rejected</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {officers.map((officer, index) => (
                                    <tr key={officer._id}>
                                        <td>
                                            <div className="officer-dept-officer-cell">
                                                {officer.profileImage ? (
                                                    <img src={officer.profileImage} alt={officer.name} />
                                                ) : (
                                                    <div className="officer-dept-officer-avatar">{officer.name.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <div className="officer-dept-officer-name">{officer.name}</div>
                                                    <div className="officer-dept-officer-email">{officer.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="officer-dept-level-badge">Level {officer.user_level}</span>
                                        </td>
                                        <td><strong>{officer.total_complaints}</strong></td>
                                        <td><span className="officer-dept-status-badge pending">{officer.pending_complaints}</span></td>
                                        <td><span className="officer-dept-status-badge progress">{officer.in_progress_complaints}</span></td>
                                        <td><span className="officer-dept-status-badge resolved">{officer.resolved_complaints}</span></td>
                                        <td><span className="officer-dept-status-badge rejected">{officer.rejected_complaints}</span></td>
                                        <td>
                                            <span className={`officer-dept-activity-status ${officer.is_active ? 'active' : 'inactive'}`}>
                                                {officer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent Complaints List */}
            <div className="officer-dept-recent-complaints">
                <h3 className="officer-dept-section-title">Recent Complaints</h3>
                <div className="officer-dept-complaints-grid">
                    {statistics.recent_complaints.map((complaint) => (
                        <div key={complaint._id} className="officer-dept-complaint-card">
                            <div className="officer-dept-complaint-header">
                                <h4>{complaint.title}</h4>
                                <span className={`officer-dept-severity-tag ${complaint.severity}`}>
                                    {complaint.severity}
                                </span>
                            </div>
                            <div className="officer-dept-complaint-meta">
                                <span className={`officer-dept-status-tag ${complaint.status}`}>
                                    {complaint.status.replace('_', ' ')}
                                </span>
                                <span className="officer-dept-level-tag">Level {complaint.level}</span>
                                <span className="officer-dept-date-tag">
                                    {new Date(complaint.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <Footer />
        </>
    );
};

export default OfficerDepartment;