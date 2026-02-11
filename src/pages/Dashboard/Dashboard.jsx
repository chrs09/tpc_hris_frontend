import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

// Import pages
import DashboardHome from "./DashboardHome";
import AttendanceList from "../Attendance/AttendanceList";
// import Employees from "./Employees"; // create simple component
// import Settings from "./Settings"; // create simple component

const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Attendance", path: "/dashboard/attendance" },
          { label: "Employees", path: "/dashboard/employees" },
          { label: "Settings", path: "/dashboard/settings" },
        ]}
      />

      <main className="flex-1 transition-all duration-300">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/dashboard/attendance" element={<AttendanceList />} />
          {/* <Route path="employees" element={<Employees />} />
          <Route path="settings" element={<Settings />} /> */}
          <Route path="*" element={<Navigate to="" />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;