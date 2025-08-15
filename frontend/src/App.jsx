import Home from './Home'
import Login from './auth/Login'
import Signup from './auth/Signup'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import NotFound from './NotFound'
import ProtectedRoute from './ProtectedRoute'

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './auth/redux/authSlice';
import UserProfile from './UserProfile'
import Complaint from './Complaint'

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
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/complain" element={
            <ProtectedRoute>
              <Complaint />
            </ProtectedRoute>
          } />
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
    </>
  );
}

export default App