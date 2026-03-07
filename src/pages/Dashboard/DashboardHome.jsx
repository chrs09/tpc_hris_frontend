// src/pages/dashboard/DashboardHome.jsx

import AdminDashboard from "./AdminDashboard";
import DriverDashboard from "./DriverDashboard";

const DashboardHome = () => {
  const role = localStorage.getItem("role");

  if (role === "driver") {
    return <DriverDashboard />;
  }

  if (role === "admin" || role === "superadmin") {
    return <AdminDashboard />;
  }

  return (
    <div className="p-8 text-red-500 font-semibold">Unauthorized role.</div>
  );
};

export default DashboardHome;
