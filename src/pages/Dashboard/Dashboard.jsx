import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import DashboardHome from "./DashboardHome";
import AttendanceList from "../Attendance/AttendanceList";

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Content */}
      <div
        className={`
          transition-all duration-300
          ${isCollapsed ? "md:ml-20" : "md:ml-64"}
          pt-20 md:pt-6
          p-6
        `}
      >
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="attendance" element={<AttendanceList />} />
          <Route path="employees" element={<div>Employees</div>} />
          <Route path="settings" element={<div>Settings</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;