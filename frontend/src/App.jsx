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

// Officer components
import OfficerComplaint from './officer/OfficerComplaint'
import OfficerQueue from './officer/OfficerQueue'
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

// Component to redirect based on user role
function RoleBasedRedirect() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'citizen';
  
  // Both roles redirect to /home
  return <Navigate to="/home" replace />;
}

// Protected route wrapper that checks user role
function RoleProtectedRoute({ children, allowedRoles = ['citizen', 'officer'] }) {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'citizen';
  
  if (!allowedRoles.includes(role)) {
    // Redirect to appropriate home based on role
    return <Navigate to={role === 'officer' ? '/officer/dashboard' : '/'} replace />;
  }
  
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  const dispatch = useDispatch();
  const token = localStorage.getItem('token');
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (token && !user) {
      dispatch(loadUser());
    }
  }, [dispatch, token, user]);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Router>
          {/* Programmatic-only route guard defined inside Router context */}
          <ProgrammaticOnlyRouteDefinitions />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* ========== COMMON ROUTES (Both Citizen & Officer) ========== */}
            {/* Home page - accessible by both roles */}
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            
            {/* Trending - accessible by both roles */}
            <Route path="/trending" element={
              <ProtectedRoute>
                <Trending />
              </ProtectedRoute>
            } />
            
            {/* Help - accessible by both roles */}
            <Route path="/help" element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            } />
            
            {/* User profile - accessible by both roles */}
            <Route path="/user" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            
            {/* ========== CITIZEN-ONLY ROUTES ========== */}
            {/* Complaint routes for citizens */}
            <Route path="/complain" element={
              <RoleProtectedRoute allowedRoles={['citizen', 'officer']}>
                {/* Show different component based on role */}
                <ComplaintRouter />
              </RoleProtectedRoute>
            } />
            <Route path="/complaint/:id" element={
              <RoleProtectedRoute allowedRoles={['citizen', 'officer']}>
                <ComplaintDetail />
              </RoleProtectedRoute>
            } />
            
            {/* ========== OFFICER ROUTES ========== */}
            {/* Officer Department Queue */}
            <Route path="/officer/queue" element={
              <RoleProtectedRoute allowedRoles={['officer']}>
                <OfficerQueue />
              </RoleProtectedRoute>
            } />
            
            {/* Officer Escalations */}
            <Route path="/officer/escalations" element={
              <RoleProtectedRoute allowedRoles={['officer']}>
                <OfficerEscalations />
              </RoleProtectedRoute>
            } />
            
            {/* Officer Analytics - Statistics and insights */}
            <Route path="/officer/analytics" element={
              <RoleProtectedRoute allowedRoles={['officer']}>
                <OfficerAnalytics />
              </RoleProtectedRoute>
            } />
            
            {/* Officer Teams */}
            <Route path="/officer/teams" element={
              <RoleProtectedRoute allowedRoles={['officer']}>
                <OfficerTeams />
              </RoleProtectedRoute>
            } />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </>
  );
}

// Component that enforces navigation only via navigate(path, { state: { _viaCode: true } })
function ProgrammaticOnly({ children }) {
  const location = useLocation();
  if (!location.state || !location.state._viaCode) {
    return <Navigate to="/" replace />;
  }
  return children;
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