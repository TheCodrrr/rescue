import Login from './auth/Login'
import Signup from './auth/Signup'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import NotFound from './NotFound'

function App() {
  return (
    <>
    {/* <Signup /> */}
      {/* <Login /> */}
      <Router>
        <Routes>
          {/* <Route path="/" element={<Home />} /> */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  )
}

export default App