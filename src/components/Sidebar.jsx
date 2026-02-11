import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ items = [] }) => {
  const location = useLocation(); // get current URL path

  const navItems = items.length
    ? items
    : [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Attendance", path: "/dashboard/attendance" },
        { label: "Employees", path: "/dashboard/employees" },
        { label: "Settings", path: "/dashboard/settings" },
      ];

  return (
    <aside className="w-64 bg-green-300 shadow-md hidden md:flex flex-col p-6 rounded-tr-3xl rounded-br-3xl">
      <div className="text-2xl font-extrabold text-primary mb-10">Tytan HRIS</div>

      <nav className="flex flex-col gap-3 text-dark font-medium">
        {navItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.path}
            className={`px-3 py-2 rounded-lg transition ${
              location.pathname === item.path
                ? "bg-green-400 text-black shadow-md"
                : "hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;