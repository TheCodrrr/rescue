import React from 'react';
import './OfficerDashboard.css';
import Navbar from '../Navbar';
import Footer from '../Footer';

const OfficerDashboard = () => {
  return (
    <div className="officer-dashboard">
      <Navbar />
      <div className="officer-dashboard-container">
        <header className="officer-dashboard-header">
          <h1>Officer Dashboard</h1>
          <p>Welcome to your command center</p>
        </header>

        <div className="officer-dashboard-content">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">📊</div>
              <div className="officer-dashboard-stat-info">
                <h3>Total Cases</h3>
                <p className="officer-dashboard-stat-number">0</p>
              </div>
            </div>

            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">⏰</div>
              <div className="officer-dashboard-stat-info">
                <h3>Pending</h3>
                <p className="officer-dashboard-stat-number">0</p>
              </div>
            </div>

            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">✅</div>
              <div className="officer-dashboard-stat-info">
                <h3>Resolved</h3>
                <p className="officer-dashboard-stat-number">0</p>
              </div>
            </div>

            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">🚨</div>
              <div className="officer-dashboard-stat-info">
                <h3>Critical</h3>
                <p className="officer-dashboard-stat-number">0</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              <p className="no-data">No recent activity</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OfficerDashboard;
