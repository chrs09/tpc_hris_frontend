import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import DashboardHome from "./DashboardHome";
import AttendanceList from "../Attendance/AttendanceList";
import UsersPage from "../Users/UsersPage";
import AdminTrips from "../Admin/AdminTrips";
import DriverTrips from "../Driver/DriverTrips";
import EmployeeListPage from "../Employee/EmployeeListPage";
import ApplicantsPage from "../Applicant/ApplicantsPage";
import Questionaire from "../ApplicantQuestionaire/Questionaire";

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const passwordChanged = location.state?.passwordChanged || false;

  return (
    <div className="bg-[#F5F7FA] min-h-screen">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Content */}
      <div
        className={`
          transition-all duration-300
          ${isCollapsed ? "md:ml-20" : "md:ml-64"}
          pt-20 md:pt-6
          p-4 md:p-6
          overflow-x-auto
        `}
      >
        {passwordChanged && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">
            <div className="font-semibold">
              Password updated successfully 🎉
            </div>
            <div className="text-sm">
              Your account is now secured with your new password.
            </div>
          </div>
        )}
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="attendance" element={<AttendanceList />} />
          <Route path="employees" element={<EmployeeListPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="admin/trips" element={<AdminTrips />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="applicant/questionaire" element={<Questionaire />} />
          {/* DRIVER */}
          <Route path="driver/trips" element={<DriverTrips />} />
          <Route path="settings" element={<div>Settings</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
