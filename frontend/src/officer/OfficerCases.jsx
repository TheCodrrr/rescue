import React, { useState } from 'react';
import './OfficerCases.css';
import Navbar from '../Navbar';
import Footer from '../Footer';

const OfficerCases = () => {
  const [filterStatus, setFilterStatus] = useState('all');

  return (
    <div className="officer-cases">
      <Navbar />
      <div className="officer-cases-container">
        <header className="officer-cases-header">
          <h1>Cases Management</h1>
          <p>View and manage all reported cases</p>
        </header>

        <div className="officer-cases-filters">
          <button 
            className={`officer-cases-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Cases
          </button>
          <button 
            className={`officer-cases-filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button 
            className={`officer-cases-filter-btn ${filterStatus === 'in-progress' ? 'active' : ''}`}
            onClick={() => setFilterStatus('in-progress')}
          >
            In Progress
          </button>
          <button 
            className={`officer-cases-filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilterStatus('resolved')}
          >
            Resolved
          </button>
        </div>

        <div className="officer-cases-content">
          <div className="cases-list">
            <p className="no-cases">No cases found</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OfficerCases;
