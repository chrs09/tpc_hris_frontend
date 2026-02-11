import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import AttendanceList from './pages/Attendance/AttendanceList';
import { Route, Routes, Navigate } from 'react-router-dom';

const App = () => {
  const isAuthenticated = () =>
    !!localStorage.getItem("access_token");

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />

      {/* Dashboard + nested routes */}
      <Route
        path="/dashboard/*"
        element={
          isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />
        }
      />
      <Route path="/dashboard/attendance" element={<AttendanceList />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default App;