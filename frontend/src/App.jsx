import Home from './Home'
import Login from './auth/Login'
import Signup from './auth/Signup'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import NotFound from './NotFound'
import ProtectedRoute from './ProtectedRoute'

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './auth/redux/authSlice';
import UserProfile from './UserProfile'
import Complaint from './Complaint'
import FollowUp from './FollowUp'
import Trending from './Trending.jsx'
import ComplaintDetail from './ComplaintDetail.jsx'
import Help from './Help.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './constants.css'

// Officer components
import OfficerComplaint from './officer/OfficerComplaint'
import OfficerDepartment from './officer/OfficerDepartment'
import OfficerEscalations from './officer/OfficerEscalations'
import OfficerAnalytics from './officer/OfficerAnalytics'
import OfficerTeams from './officer/OfficerTeams'

const queryClient = new QueryClient();

// Component to redirect to appropriate complaint page based on role
function ComplaintRouter() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'citizen';
  
  if (role === 'officer') {
    return <OfficerComplaint />;
  }
  
  return <Complaint />;
}

// Protected route wrapper that checks user role
function RoleProtectedRoute({ children, allowedRoles = ['citizen', 'officer'] }) {
  const { user, loading, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const token = localStorage.getItem('token');
  
  // Show loading spinner while user data is being fetched
  if (token && !user && loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2C3333 0%, #31363F 25%, #395B64 50%, #393E46 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const role = user?.role || 'citizen';
  
  if (!allowedRoles.includes(role)) {
    // Redirect to appropriate home based on role
    return <Navigate to={role === 'officer' ? '/officer/dashboard' : '/'} replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const dispatch = useDispatch();
  const token = localStorage.getItem('token');
  const { user, loading, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(loadUser());
    }
  }, [dispatch, token, user]);

  // ⛔ Prevent redirect until auth is checked
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/help" element={<Help />} />

          <Route path="/user" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/complain" element={<ProtectedRoute><ComplaintRouter /></ProtectedRoute>} />
          <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />

          {/* Officer-only */}
          <Route path="/officer/*" element={
            <ProtectedRoute requiredRole="officer">
              <Routes>
                <Route path="department" element={<OfficerDepartment />} />
                <Route path="escalations" element={<OfficerEscalations />} />
                <Route path="analytics" element={<OfficerAnalytics />} />
                <Route path="teams" element={<OfficerTeams />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}


// Component that enforces navigation only via navigate(path, { state: { _viaCode: true } })
function ProgrammaticOnly({ children }) {
  const location = useLocation();
  if (!location.state || !location.state._viaCode) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Example target component (replace with your real screen)
function AuditPage() {
  return <div style={{ padding: '2rem', color: '#fff' }}>Audit / Sensitive Report Page</div>;
}

// (Optional) central place to export a helper navigate flag (could also be a custom hook elsewhere)
export function navigateProgrammatically(navigate, path) {
  navigate(path, { state: { _viaCode: true } });
}

// Placeholder to keep possibility for future shared logic; currently empty
function ProgrammaticOnlyRouteDefinitions() { return null; }

export default App