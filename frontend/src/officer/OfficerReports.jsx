import React, { useState } from 'react';
import './OfficerReports.css';
import Navbar from '../Navbar';
import Footer from '../Footer';

const OfficerReports = () => {
  const [reportType, setReportType] = useState('monthly');

  return (
    <div className="officer-reports">
      <Navbar />
      <div className="officer-reports-container">
        <header className="officer-reports-header">
          <h1>Reports</h1>
          <p>Generate and download comprehensive reports</p>
        </header>

        <div className="reports-content">
          <div className="report-generator">
            <h2>Generate New Report</h2>
            
            <div className="report-options">
              <div className="option-group">
                <label>Report Type</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                  className="report-select"
                >
                  <option value="daily">Daily Report</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="quarterly">Quarterly Report</option>
                  <option value="annual">Annual Report</option>
                </select>
              </div>

              <div className="option-group">
                <label>Date Range</label>
                <div className="date-inputs">
                  <input type="date" className="report-input" />
                  <span>to</span>
                  <input type="date" className="report-input" />
                </div>
              </div>

              <button className="generate-btn">
                <svg className="officer-reports-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </button>
            </div>
          </div>

          <div className="recent-reports">
            <h2>Recent Reports</h2>
            <div className="reports-list">
              <p className="no-reports">No reports generated yet</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OfficerReports;
