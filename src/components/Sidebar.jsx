import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowBigLeftDash,
  Menu,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { logout } from "../utils/auth";
import {
  getReminders,
  createReminder,
  resolveReminder,
} from "../api/reminder";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const isSuperAdmin = role === "superadmin";

  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Dropdown state
  const [openSections, setOpenSections] = useState({
    hris: true,
    trips: false,
    admin: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ----------------------------
  // Load reminders
  // ----------------------------
  const loadReminders = async () => {
    try {
      const data = await getReminders();
      setReminders(data);
    } catch (error) {
      console.error("Failed to load reminders:", error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadReminders();
    }
  }, [isSuperAdmin]);

  // ----------------------------
  // Create Reminder
  // ----------------------------
  const handleCreateReminder = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      await createReminder(newMessage);
      setNewMessage("");
      setShowModal(false);
      await loadReminders();
    } catch (error) {
      console.error("Failed to create reminder:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveReminder(id);
      await loadReminders();
    } catch (error) {
      console.error("Failed to resolve reminder:", error);
    }
  };

  // ----------------------------
  // Navigation Structure
  // ----------------------------
  const navSections = [
    {
      id: "main",
      title: "Main",
      dropdown: false,
      items: [
        {
          label: "Dashboard",
          path: "/dashboard",
          roles: ["superadmin", "admin", "driver", "helper"],
        },
      ],
    },
    {
      id: "hris",
      title: "HRIS",
      dropdown: true,
      items: [
        {
          label: "Attendance",
          path: "/dashboard/hris/attendance",
          roles: ["superadmin", "admin"],
        },
        {
          label: "Employees",
          path: "/dashboard/hris/employees",
          roles: ["superadmin", "admin"],
        },
      ],
    },
    {
      id: "trips",
      title: "Trip Management",
      dropdown: true,
      items: [
        {
          label: "Trips",
          path:
            role === "driver"
              ? "/dashboard/trips/driver"
              : "/dashboard/trips/admin",
          roles: ["superadmin", "admin", "driver"],
        },
      ],
    },
    {
      id: "admin",
      title: "Administration",
      dropdown: true,
      items: [
        {
          label: "Users",
          path: "/dashboard/admin/users",
          roles: ["superadmin"],
        },
        {
          label: "Settings",
          path: "/dashboard/settings",
          roles: ["superadmin"],
        },
      ],
    },
  ];

  const visibleSections = navSections
  .map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  }))
  .filter((section) => section.items.length > 0);

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
          flex flex-col p-6 shadow-lg transition-all duration-300
          ${isCollapsed ? "w-20" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 z-50
        `}
      >
        {/* Collapse Button */}
        <div className="hidden md:flex justify-end mb-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white"
          >
            {isCollapsed ? <Menu size={28} /> : <ArrowBigLeftDash size={22} />}
          </button>
        </div>

        {/* Greeting */}
        {!isCollapsed && (
          <div className="text-xl font-extrabold mb-8 capitalize">
            Hello! {username} ({role})
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-4 flex-1">
          {visibleSections.map((section) => (
            <div key={section.id}>
              {!isCollapsed && (
                <button
                  onClick={() =>
                    section.dropdown && toggleSection(section.id)
                  }
                  className={`flex items-center justify-between w-full text-left text-xs uppercase mb-2 transition
                  focus:outline-none cursor-pointer
                    ${
                      openSections[section.id] ||
                      location.pathname.includes(section.id)
                        ? "text-white font-bold"
                        : "text-gray-300"
                    }
                  `}
                >
                  {section.title}

                  {section.dropdown &&
                    (openSections[section.id] ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    ))}
                </button>
              )}

              {(!section.dropdown || openSections[section.id]) && (
                <div className="flex flex-col gap-2 ml-2">
                  {section.items
                    .filter((item) => item.roles.includes(role))
                    .map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={`px-3 py-2 rounded-lg transition ${
                          location.pathname === item.path
                            ? "bg-[#ffa903] text-black"
                            : "hover:bg-[#ffa903]"
                        }`}
                      >
                        {isCollapsed
                          ? item.label.charAt(0)
                          : item.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Reminders */}
        {isSuperAdmin && !isCollapsed && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">
                Reminders ({reminders.length})
              </span>

              <button
                onClick={() => setShowModal(true)}
                className="text-xs bg-yellow-400 text-black px-2 py-1 rounded"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#ffa903] text-black p-2 rounded text-xs flex justify-between"
                >
                  <span className="pr-2">{r.message}</span>

                  <button
                    onClick={() => handleResolve(r.id)}
                    className="text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-[#023047] rounded-xl p-6 w-80 shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Create Reminder</h2>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full border rounded p-2 text-sm mb-4 text-white"
                rows="3"
                placeholder="Enter reminder..."
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateReminder}
                  disabled={loading}
                  className="px-3 py-1 bg-[#ffa903] text-black rounded"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition mt-auto"
        >
          {isCollapsed ? "⎋" : "Logout"}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;