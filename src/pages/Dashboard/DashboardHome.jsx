// src/pages/dashboard/DashboardHome.jsx

import AdminDashboard from "./AdminDashboard";
import DriverDashboard from "./DriverDashboard";
import PWAInstallButton from "../../components/PWAInstallButton";

const DashboardHome = () => {
  const role = localStorage.getItem("role");

  return (
    <div className="p-4">
      <div className="flex justify-end mb-4">
        <PWAInstallButton />
      </div>

      {role === "driver" && <DriverDashboard />}

      {(role === "admin" || role === "superadmin") && <AdminDashboard />}

      {!role && (
        <div className="p-8 text-red-500 font-semibold">
          Unauthorized role.
        </div>
      )}
    </div>
  );
};

export default DashboardHome;