// src/pages/dashboard/DashboardHome.jsx

import AdminDashboard from "./AdminDashboard";
import DriverDashboard from "./DriverDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import PWAInstallButton from "../../components/PWAInstallButton";

const ADMIN_DASHBOARD_ROLES = [
  "admin",
  "superadmin",
  "coordinator_admin",
  "payroll_admin",
  "office_admin",
];

const EMPLOYEE_DASHBOARD_ROLES = ["employee", "helper"];

const DashboardHome = () => {
  const role = localStorage.getItem("role");

  return (
    <div className="p-4">
      <div className="flex justify-end mb-4">
        <PWAInstallButton />
      </div>

      {role === "driver" && <DriverDashboard />}

      {EMPLOYEE_DASHBOARD_ROLES.includes(role) && <EmployeeDashboard />}

      {ADMIN_DASHBOARD_ROLES.includes(role) && <AdminDashboard />}

      {!role && (
        <div className="p-8 text-danger font-semibold">Unauthorized role.</div>
      )}
    </div>
  );
};

export default DashboardHome;
