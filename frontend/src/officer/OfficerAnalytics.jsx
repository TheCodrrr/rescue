import React from 'react';
import './OfficerAnalytics.css';
import Navbar from '../Navbar';
import Footer from '../Footer';

const OfficerAnalytics = () => {
  return (
    <div className="officer-analytics">
      <Navbar />
      <div className="officer-analytics-container">
        <header className="officer-analytics-header">
          <h1>Analytics Dashboard</h1>
          <p>Insights and statistics for better decision making</p>
        </header>

        <div className="analytics-content">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Case Trends</h3>
              <div className="chart-placeholder">
                <p>Chart will be displayed here</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Response Times</h3>
              <div className="chart-placeholder">
                <p>Chart will be displayed here</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Case Distribution</h3>
              <div className="chart-placeholder">
                <p>Chart will be displayed here</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Resolution Rate</h3>
              <div className="chart-placeholder">
                <p>Chart will be displayed here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OfficerAnalytics;
