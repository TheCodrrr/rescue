import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import axiosInstance from './api/axios';
import {
    BarChart3,
    TrendingUp,
    MapPin,
    AlertCircle,
    CheckCircle,
    Clock,
    ThumbsUp,
    ThumbsDown,
    Activity,
    Loader,
    AlertTriangle,
    FileText,
    Target
} from 'lucide-react';
import './Analytics.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [categoryData, setCategoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useSelector((state) => state.auth);
    const trendChartRef = useRef(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch both analytics and category data in parallel
            const [analyticsResponse, categoryResponse] = await Promise.all([
                axiosInstance.get('/analytics/nearby'),
                axiosInstance.get('/analytics/category')
            ]);
            
            console.log("Analytics data: ", analyticsResponse);
            console.log("Category data: ", categoryResponse);
            
            setAnalyticsData(analyticsResponse.data.data);
            setCategoryData(categoryResponse.data.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.message || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    // D3.js Gradient Line Chart for Complaint Trends
    useEffect(() => {
        if (!categoryData?.complaintsByDate || !trendChartRef.current) return;

        // Clear previous chart
        d3.select(trendChartRef.current).selectAll("*").remove();

        const data = categoryData.complaintsByDate.map(d => ({
            date: new Date(d.date),
            count: d.count
        }));

        // Chart dimensions
        const containerWidth = trendChartRef.current.clientWidth;
        const width = containerWidth || 800;
        const height = 300;
        const marginTop = 30;
        const marginRight = 30;
        const marginBottom = 50;
        const marginLeft = 50;

        // Create scales
        const x = d3.scaleUtc()
            .domain(d3.extent(data, d => d.date))
            .range([marginLeft, width - marginRight]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) || 10]).nice()
            .range([height - marginBottom, marginTop]);

        // Color scale for gradient (based on count)
        const colorScale = d3.scaleSequential()
            .domain([0, d3.max(data, d => d.count) || 10])
            .interpolator(d3.interpolateRgbBasis(['#10b981', '#00ADB5', '#8b5cf6', '#ec4899', '#ef4444']));

        // Create the line generator
        const line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(d => x(d.date))
            .y(d => y(d.count));

        // Create SVG
        const svg = d3.select(trendChartRef.current)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;");

        // Create gradient definition
        const gradientId = `line-gradient-${Date.now()}`;
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", gradientId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", marginLeft)
            .attr("y1", 0)
            .attr("x2", width - marginRight)
            .attr("y2", 0);

        // Add gradient stops based on data
        data.forEach((d, i) => {
            gradient.append("stop")
                .attr("offset", `${(i / (data.length - 1)) * 100}%`)
                .attr("stop-color", colorScale(d.count));
        });

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x)
                .ticks(d3.timeWeek.every(1))
                .tickFormat(d3.timeFormat("%b %d")))
            .call(g => g.select(".domain").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick line").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .attr("transform", "rotate(-45)")
                .attr("text-anchor", "end")
                .attr("dx", "-0.5em")
                .attr("dy", "0.5em"));

        // Add Y axis
        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(5))
            .call(g => g.select(".domain").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick line").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick text").attr("fill", "#94a3b8"));

        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 12)
            .attr("x", -(height / 2))
            .attr("fill", "#94a3b8")
            .attr("font-size", "12px")
            .attr("text-anchor", "middle")
            .text("Complaints");

        // Add grid lines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-(width - marginLeft - marginRight))
                .tickFormat(""))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke", "#1e293b")
                .attr("stroke-dasharray", "2,2"));

        // Add area fill with gradient
        const area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(d => x(d.date))
            .y0(height - marginBottom)
            .y1(d => y(d.count));

        svg.append("path")
            .datum(data)
            .attr("fill", `url(#${gradientId})`)
            .attr("fill-opacity", 0.15)
            .attr("d", area);

        // Add the line path
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", `url(#${gradientId})`)
            .attr("stroke-width", 2.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line);

        // Add dots at data points
        svg.selectAll(".dot")
            .data(data)
            .join("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.count))
            .attr("r", 4)
            .attr("fill", d => colorScale(d.count))
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 7);
                
                // Show tooltip
                const tooltip = svg.append("g")
                    .attr("class", "tooltip-group")
                    .attr("transform", `translate(${x(d.date)},${y(d.count) - 15})`);

                tooltip.append("rect")
                    .attr("x", -40)
                    .attr("y", -30)
                    .attr("width", 80)
                    .attr("height", 28)
                    .attr("rx", 4)
                    .attr("fill", "rgba(0,0,0,0.85)")
                    .attr("stroke", colorScale(d.count))
                    .attr("stroke-width", 1);

                tooltip.append("text")
                    .attr("text-anchor", "middle")
                    .attr("y", -12)
                    .attr("fill", "#fff")
                    .attr("font-size", "11px")
                    .text(`${d3.timeFormat("%b %d")(d.date)}: ${d.count}`);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4);
                svg.selectAll(".tooltip-group").remove();
            });

    }, [categoryData]);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    // Chart configurations
    const categoryColors = {
        rail: '#00ADB5',
        road: '#10b981',
        fire: '#ef4444',
        cyber: '#8b5cf6',
        police: '#f59e0b',
        court: '#ec4899'
    };

    const statusColors = {
        pending: '#f59e0b',
        in_progress: '#00ADB5',
        resolved: '#10b981',
        rejected: '#ef4444'
    };

    const severityColors = {
        low: '#10b981',
        medium: '#f59e0b',
        high: '#ef4444'
    };

    // Default colors for any category not explicitly defined
    const defaultColors = ['#00ADB5', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

    // Category Distribution Chart (Doughnut) - using data from /analytics/category
    const categoryChartData = categoryData?.categoryDistribution ? (() => {
        // Transform object format { rail: 5, fire: 3, ... } to array format
        const categories = Object.entries(categoryData.categoryDistribution)
            .filter(([_, count]) => count > 0) // Only show categories with complaints
            .map(([category, count]) => ({ category, count }));
        
        // If no categories have complaints, return null
        if (categories.length === 0) return null;
        
        return {
            labels: categories.map(c => c.category.toUpperCase()),
            datasets: [{
                data: categories.map(c => c.count),
                backgroundColor: categories.map((c, index) => 
                    categoryColors[c.category] || defaultColors[index % defaultColors.length]
                ),
                borderColor: '#1e293b',
                borderWidth: 2,
                hoverOffset: 10
            }]
        };
    })() : null;

    // Status Distribution Chart (Pie)
    const statusChartData = analyticsData ? {
        labels: analyticsData.statusDistribution.map(s => 
            s.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        ),
        datasets: [{
            data: analyticsData.statusDistribution.map(s => s.count),
            backgroundColor: analyticsData.statusDistribution.map(s => statusColors[s.status]),
            borderColor: '#1e293b',
            borderWidth: 2
        }]
    } : null;

    // Time Series Chart (Line)
    const timeSeriesChartData = analyticsData ? {
        labels: analyticsData.timeSeriesData.map(t => t.month),
        datasets: [{
            label: 'Complaints',
            data: analyticsData.timeSeriesData.map(t => t.count),
            borderColor: '#00ADB5',
            backgroundColor: 'rgba(0, 173, 181, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00ADB5',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
        }]
    } : null;

    // Severity Distribution Chart (Bar)
    const severityChartData = analyticsData ? {
        labels: analyticsData.severityDistribution.map(s => s.severity.toUpperCase()),
        datasets: [{
            label: 'Count',
            data: analyticsData.severityDistribution.map(s => s.count),
            backgroundColor: analyticsData.severityDistribution.map(s => severityColors[s.severity]),
            borderColor: analyticsData.severityDistribution.map(s => severityColors[s.severity]),
            borderWidth: 2,
            borderRadius: 8
        }]
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#fff',
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                bodyFont: {
                    size: 13
                },
                titleFont: {
                    size: 14,
                    weight: 'bold'
                }
            }
        },
        scales: {
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(148, 163, 184, 0.1)' }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#fff',
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    padding: 15,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const dataset = context.dataset.data;
                        const total = dataset.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader size={48} className="loading-icon" />
                </motion.div>
                <p>Loading analytics data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-error">
                <AlertTriangle size={48} className="error-icon" />
                <h3>Failed to Load Analytics</h3>
                <p>{error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    Try Again
                </button>
            </div>
        );
    }

    if (!analyticsData || analyticsData.totalComplaints === 0) {
        return (
            <div className="analytics-empty">
                <MapPin size={64} className="empty-icon" />
                <h3>No Data Available</h3>
                <p>No complaints found within 10km of your location.</p>
                <p className="empty-subtitle">Make sure your profile has location information.</p>
            </div>
        );
    }

    return (
        <motion.div
            className="analytics-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <motion.div className="analytics-header" variants={itemVariants}>
                <div className="header-content">
                    <div className="header-icon-container">
                        <BarChart3 size={32} />
                    </div>
                    <div>
                        <h1 className="analytics-title">Area Analytics</h1>
                        <p className="analytics-subtitle">
                            Complaints within 100km radius • {categoryData?.totalComplaints || 0} total complaints
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div className="stats-grid" variants={itemVariants}>
                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon total">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Complaints</p>
                        <h3 className="stat-value">{categoryData?.totalComplaints || 0}</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon resolved">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Resolution Rate</p>
                        <h3 className="stat-value">{categoryData?.resolutionRate || 0}%</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon user">
                        <Target size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Your Complaints</p>
                        <h3 className="stat-value">{categoryData?.userComplaintsCount || 0}</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon engagement">
                        <Activity size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Engagement Rate</p>
                        <h3 className="stat-value">{categoryData?.engagementStats?.engagementRate || 0}%</h3>
                    </div>
                </motion.div>
            </motion.div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Category Distribution */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Category Distribution</h3>
                        <p className="chart-subtitle">Complaints by category</p>
                    </div>
                    <div className="chart-container">
                        {categoryChartData && (
                            <Doughnut data={categoryChartData} options={doughnutOptions} />
                        )}
                    </div>
                </motion.div>

                {/* Status Distribution */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Status Breakdown</h3>
                        <p className="chart-subtitle">Current complaint status</p>
                    </div>
                    <div className="chart-container">
                        {statusChartData && (
                            <Pie data={statusChartData} options={doughnutOptions} />
                        )}
                    </div>
                </motion.div>

                {/* Time Series - D3.js Gradient Line Chart */}
                <motion.div className="chart-card chart-wide" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Complaint Trends</h3>
                        <p className="chart-subtitle">Daily complaint volume (Last 60 days)</p>
                    </div>
                    <div className="chart-container d3-chart-container" ref={trendChartRef}>
                        {!categoryData?.complaintsByDate && (
                            <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '100px' }}>
                                No trend data available
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Severity Distribution */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Severity Levels</h3>
                        <p className="chart-subtitle">Complaint severity breakdown</p>
                    </div>
                    <div className="chart-container">
                        {severityChartData && (
                            <Bar data={severityChartData} options={chartOptions} />
                        )}
                    </div>
                </motion.div>

                {/* Response Time Stats */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Response Time</h3>
                        <p className="chart-subtitle">Average response statistics</p>
                    </div>
                    <div className="response-stats">
                        <div className="response-stat-item">
                            <Clock className="response-icon" />
                            <div>
                                <p className="response-label">Average</p>
                                <h4 className="response-value">{analyticsData.responseTimeStats.average}h</h4>
                            </div>
                        </div>
                        <div className="response-stat-item">
                            <TrendingUp className="response-icon" />
                            <div>
                                <p className="response-label">Fastest</p>
                                <h4 className="response-value">{analyticsData.responseTimeStats.min}h</h4>
                            </div>
                        </div>
                        <div className="response-stat-item">
                            <AlertCircle className="response-icon" />
                            <div>
                                <p className="response-label">Slowest</p>
                                <h4 className="response-value">{analyticsData.responseTimeStats.max}h</h4>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Top Locations */}
                <motion.div className="chart-card chart-wide" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Hotspot Locations</h3>
                        <p className="chart-subtitle">Areas with most complaints</p>
                    </div>
                    <div className="locations-list">
                        {analyticsData.topLocations.map((location, index) => (
                            <motion.div
                                key={index}
                                className="location-item"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="location-rank">{index + 1}</div>
                                <MapPin className="location-icon" />
                                <div className="location-info">
                                    <p className="location-name">{location.location}</p>
                                    <p className="location-count">{location.count} complaints</p>
                                </div>
                                <div className="location-bar">
                                    <motion.div
                                        className="location-bar-fill"
                                        initial={{ width: 0 }}
                                        animate={{ 
                                            width: `${(location.count / analyticsData.topLocations[0].count) * 100}%` 
                                        }}
                                        transition={{ duration: 1, delay: index * 0.1 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Engagement Stats */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Community Engagement</h3>
                        <p className="chart-subtitle">Upvotes & Downvotes</p>
                    </div>
                    <div className="engagement-stats">
                        <div className="engagement-item upvote">
                            <ThumbsUp size={32} />
                            <div>
                                <p className="engagement-label">Total Upvotes</p>
                                <h3 className="engagement-value">{categoryData?.engagementStats?.totalUpvotes || 0}</h3>
                            </div>
                        </div>
                        <div className="engagement-item downvote">
                            <ThumbsDown size={32} />
                            <div>
                                <p className="engagement-label">Total Downvotes</p>
                                <h3 className="engagement-value">{categoryData?.engagementStats?.totalDownvotes || 0}</h3>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Analytics;
