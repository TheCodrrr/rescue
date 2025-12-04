import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/analytics/nearby');
            console.log("Hello Hello Hello: ", response);
            setAnalyticsData(response.data.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.message || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

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

    // Category Distribution Chart (Doughnut)
    const categoryChartData = analyticsData ? {
        labels: analyticsData.categoryDistribution.map(c => c.category.toUpperCase()),
        datasets: [{
            data: analyticsData.categoryDistribution.map(c => c.count),
            backgroundColor: analyticsData.categoryDistribution.map(c => categoryColors[c.category]),
            borderColor: '#1e293b',
            borderWidth: 2,
            hoverOffset: 10
        }]
    } : null;

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
                <button onClick={fetchAnalytics} className="retry-btn">
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
                            Complaints within 10km radius • {analyticsData.totalComplaints} total complaints
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
                        <h3 className="stat-value">{analyticsData.totalComplaints}</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon resolved">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Resolution Rate</p>
                        <h3 className="stat-value">{analyticsData.resolutionRate}%</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon user">
                        <Target size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Your Complaints</p>
                        <h3 className="stat-value">{analyticsData.userComplaintsCount}</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                    <div className="stat-icon engagement">
                        <Activity size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Engagement Rate</p>
                        <h3 className="stat-value">{analyticsData.engagementStats.engagementRate}%</h3>
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

                {/* Time Series */}
                <motion.div className="chart-card chart-wide" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Complaint Trends</h3>
                        <p className="chart-subtitle">Monthly complaint volume (Last 6 months)</p>
                    </div>
                    <div className="chart-container">
                        {timeSeriesChartData && (
                            <Line data={timeSeriesChartData} options={chartOptions} />
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
                                <h3 className="engagement-value">{analyticsData.engagementStats.totalUpvotes}</h3>
                            </div>
                        </div>
                        <div className="engagement-item downvote">
                            <ThumbsDown size={32} />
                            <div>
                                <p className="engagement-label">Total Downvotes</p>
                                <h3 className="engagement-value">{analyticsData.engagementStats.totalDownvotes}</h3>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Analytics;
