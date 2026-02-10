import Login from './pages/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import { Route, Routes, Navigate } from 'react-router-dom'

const App = () => {
  const isAuthenticated = () =>
    !!localStorage.getItem("access_token"); // FIXED key

  return (
    <Routes>
      {/* Redirect root */}
      <Route path="/" element={<Navigate to="/login" />} />

      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App