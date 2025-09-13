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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient();

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
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            {/* Complaint parent route */}
            <Route path="/complain" element={<ProtectedRoute><Complaint /></ProtectedRoute>} />
            {/* ComplaintDetail as separate route (programmatic only) */}
            <Route path="/complaint/:id" element={
              <ProgrammaticOnly>
                <ProtectedRoute>
                  <ComplaintDetail />
                </ProtectedRoute>
              </ProgrammaticOnly>
            } />
            <Route path="/trending" element={<Trending />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/user" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
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