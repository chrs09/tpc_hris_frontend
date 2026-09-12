import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import DashboardHome from "./DashboardHome";
import AttendanceList from "../Attendance/AttendanceList";
import UsersPage from "../Users/UsersPage";
import AdminTrips from "../Admin/AdminTrips";
import TripBypass from "../Admin/TripBypass";
import OrgHierarchy from "../Admin/OrgHierarchy";
import CashAdvanceSettings from "../Admin/CashAdvanceSettings";
import CashAdvanceApprovals from "../Admin/CashAdvanceApprovals";
import ModuleAssignment from "../Admin/ModuleAssignment";
import RoleAccess from "../Admin/RoleAccess";
import OvertimeApprovals from "../Overtime/OvertimeApprovals";
import StoreManagement from "../Admin/StoreManagement";
import TripMaintenance from "../Admin/TripMaintenance";
import TripCategoriesPage from "../Admin/TripCategoriesPage";
import SuppliersPage from "../Admin/SuppliersPage";
import TripPlanning from "../Coordinator/TripPlanning";
import DriverTrips from "../Driver/DriverTrips";
import EmployeeListPage from "../Employee/EmployeeListPage";
import ApplicantsPage from "../Applicant/ApplicantsPage";
import Questionaire from "../ApplicantQuestionaire/Questionaire";
import PayrollList from "../Payroll/PayrollList";
import HolidaysPage from "../Holiday/HolidaysPage";
import ErrorLogsPage from "../Admin/ErrorLogsPage";
import FinanceTrips from "../Finance/FinanceTrips";
import OfficeTripReview from "../Office/OfficeTripReview";
import FinanceExpenses from "../Finance/FinanceExpenses";
import LeaveManagement from "../Leave/LeaveManagement";
import {
  isImpersonating,
  getImpersonatorUsername,
  stopImpersonation,
} from "../../utils/impersonation";

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const passwordChanged = location.state?.passwordChanged || false;
  const impersonating = isImpersonating();
  const currentUsername = localStorage.getItem("username");
  const impersonatorUsername = getImpersonatorUsername();

  const handleReturnToSuperadmin = () => {
    stopImpersonation();
    window.location.href = "/dashboard/users";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {impersonating && (
        <div
          className={`
            fixed z-40 flex flex-wrap items-center justify-center gap-3 bg-warning px-4 py-2 text-center text-sm font-semibold text-warning-foreground shadow-md
            left-0 right-0 top-16
            md:left-64 md:top-0
          `}
        >
          <span>
            {impersonatorUsername && (
              <span className="capitalize">{impersonatorUsername}</span>
            )}{" "}
            is viewing as{" "}
            <span className="capitalize">{currentUsername}</span> (read-only)
          </span>
          <button
            onClick={handleReturnToSuperadmin}
            className="rounded-lg bg-black/20 px-3 py-1 text-xs font-bold hover:bg-black/30"
          >
            Return to Superadmin
          </button>
        </div>
      )}

      {/* Content */}
      <div
        className={`
          transition-all duration-300
          ${isCollapsed ? "md:ml-20" : "md:ml-64"}
          ${impersonating ? "pt-32 md:pt-16" : "pt-20 md:pt-6"}
          p-4 md:p-6
          overflow-x-auto
        `}
      >
        {passwordChanged && (
          <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-success">
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
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="employees" element={<EmployeeListPage />} />
          <Route path="payroll" element={<PayrollList />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="hierarchy" element={<OrgHierarchy />} />
          <Route
            path="cash-advance-settings"
            element={<CashAdvanceSettings />}
          />
          <Route
            path="cash-advance-approvals"
            element={<CashAdvanceApprovals />}
          />
          <Route path="module-assignment" element={<ModuleAssignment />} />
          <Route path="role-access" element={<RoleAccess />} />
          <Route path="overtime-approvals" element={<OvertimeApprovals />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="error-logs" element={<ErrorLogsPage />} />
          <Route path="admin/trips" element={<AdminTrips />} />
          <Route path="admin/trip-bypass" element={<TripBypass />} />
          <Route path="admin/stores" element={<StoreManagement />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="applicant/questionaire" element={<Questionaire />} />
          <Route path="admin/trip-maintenance" element={<TripMaintenance />} />
          <Route path="admin/trip-categories" element={<TripCategoriesPage />} />
          <Route path="admin/suppliers" element={<SuppliersPage />} />
          <Route path="admin/shipment-planning" element={<TripPlanning />} />
          {/* Office */}
          <Route path="office/trips" element={<OfficeTripReview />} />
          {/* FINANCE */}
          <Route path="finance/trips" element={<FinanceTrips />} />
          <Route path="finance/expenses" element={<FinanceExpenses />} />
          {/* DRIVER */}
          <Route path="driver/trips" element={<DriverTrips />} />
          <Route path="settings" element={<div>Settings</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
