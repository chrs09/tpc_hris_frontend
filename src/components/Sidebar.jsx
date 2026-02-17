import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowBigLeft,
  ArrowBigLeftDash,
  ArrowBigRight,
  Menu,
  X,
} from "lucide-react";
import { logout } from "../utils/auth";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Attendance", path: "/dashboard/attendance" },
    { label: "Employees", path: "/dashboard/employees" },
    { label: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#023047] text-white flex items-center justify-between p-4 z-50">
        <h1 className="font-bold">Tytan HRIS</h1>
        <button onClick={() => setIsMobileOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-[#023047] text-white
          flex flex-col p-6 shadow-lg
          transition-all duration-300 transform z-50
          ${isCollapsed ? "w-20" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Desktop Collapse Button */}
        <div className="hidden md:flex justify-end mb-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white"
          >
            {isCollapsed ? <Menu size={30} /> : <ArrowBigLeftDash size={20} />}
          </button>
        </div>

        {/* Title */}
        {!isCollapsed && (
          <div className="text-xl font-extrabold mb-8">Tytan HRIS</div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-3 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`
                px-3 py-2 rounded-lg transition
                ${
                  location.pathname === item.path
                    ? "bg-[#ffa903] text-black"
                    : "hover:bg-[#ffa903]"
                }
              `}
            >
              {isCollapsed ? item.label.charAt(0) : item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition place-content-center"
        >
          {isCollapsed ? "⎋" : "Logout"}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
