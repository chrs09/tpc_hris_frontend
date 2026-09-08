import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowBigLeftDash,
  Menu,
  LayoutDashboard,
  Users,
  Truck,
  Shield,
  ChevronDown,
  Wallet,
  Landmark,
} from "lucide-react";
import { logout } from "../utils/auth";
import { getReminders, createReminder, resolveReminder } from "../api/reminder";
import ThemeToggle from "./ui/ThemeToggle";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const isSuperAdmin = role === "superadmin";

  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // ✅ ROUTE MATCH HELPER (CLEAN FIX)
  // =========================
  const isRouteActive = useCallback(
    (path) => {
      if (path === "/dashboard") {
        return location.pathname === path;
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  // =========================
  // NAV GROUPS
  // =========================
  const navGroups = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
        children: [
          {
            label: "Overview",
            path: "/dashboard",
            roles: [
              "superadmin",
              "admin",
              "driver",
              "helper",
              "employee",
              "payroll_admin",
              "coordinator_admin",
              "office_admin",
            ],
          },
        ],
      },
      {
        label: "HRIS",
        icon: <Users size={18} />,
        children: [
          {
            label: "Attendance",
            path: "/dashboard/attendance",
            roles: ["superadmin", "admin"],
          },
          {
            label: "Leave Requests",
            path: "/dashboard/leave",
            roles: ["superadmin", "admin"],
          },
          {
            label: "Employees",
            path: "/dashboard/employees",
            roles: ["superadmin", "admin"],
          },
          {
            label: "Applicants", // ✅ ADD THIS
            path: "/dashboard/applicants",
            roles: ["superadmin", "admin"],
          },
          {
            label: "Questionaire", // ✅ ADD THIS
            path: "/dashboard/applicant/questionaire",
            roles: ["superadmin", "admin"],
          },
        ],
      },
      {
        label: "Payroll",
        icon: <Wallet size={18} />,
        children: [
          {
            label: "Payroll",
            path: "/dashboard/payroll",
            roles: ["superadmin", "payroll_admin"],
          },
        ],
      },
      {
        label: "Trip Management",
        icon: <Truck size={18} />,
        children: [
          {
            label: "Trips",
            path:
              role === "driver"
                ? "/dashboard/driver/trips"
                : "/dashboard/admin/trips",
            roles: ["superadmin", "driver", "coordinator_admin"],
          },
          {
            label: "Office Trip Review",
            path: "/dashboard/office/trips",
            roles: ["superadmin", "coordinator_admin", "office_admin"],
          },
          {
            label: "Maintenance",
            path: "/dashboard/admin/trip-maintenance",
            roles: ["superadmin", "coordinator_admin"],
          },
          {
            label: "Stores",
            path: "/dashboard/admin/stores",
            roles: ["superadmin", "coordinator_admin"],
          },
          // {
          //   label: "Shipment Planning",
          //   path: "/dashboard/admin/shipment-planning",
          //   roles: ["superadmin", "admin"],
          // },
          {
            label: "Daily Dispatch Board",
            path: "/dashboard/admin/daily-deliveries",
            roles: ["superadmin", "coordinator_admin"],
          },
        ],
      },
      {
        // NEW: Finance parent group
        label: "Finance",
        icon: <Landmark size={18} />,
        children: [
          {
            label: "Trip Review",
            path: "/dashboard/finance/trips",
            roles: ["superadmin"],
          },
          {
            label: "Expenses",
            path: "/dashboard/finance/expenses",
            roles: ["superadmin"],
          },
        ],
      },
      {
        label: "Administrator",
        icon: <Shield size={18} />,
        children: [
          {
            label: "Users",
            path: "/dashboard/users",
            roles: ["superadmin"],
          },
          {
            label: "Holidays",
            path: "/dashboard/holidays",
            roles: ["superadmin"],
          },
          {
            label: "Settings",
            path: "/dashboard/settings",
            roles: ["superadmin"],
          },
        ],
      },
    ],
    [role],
  );

  // =========================
  // LOAD REMINDERS
  // =========================
  const loadReminders = async () => {
    try {
      const data = await getReminders();
      setReminders(data);
    } catch (error) {
      console.error("Failed to load reminders:", error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadReminders();
  }, [isSuperAdmin]);

  // =========================
  // AUTO OPEN ACTIVE GROUP
  // =========================
  useEffect(() => {
    navGroups.forEach((group) => {
      if (group.children.some((item) => isRouteActive(item.path))) {
        setOpenGroup(group.label);
      }
    });
  }, [location.pathname, navGroups, isRouteActive]);

  // =========================
  // REMINDER ACTIONS
  // =========================
  const handleCreateReminder = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      await createReminder(newMessage);
      setNewMessage("");
      setShowModal(false);
      await loadReminders();
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    await resolveReminder(id);
    await loadReminders();
  };

  const toggleGroup = (label) => {
    setOpenGroup(openGroup === label ? null : label);
  };

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-surface text-fg border-b border-border flex items-center justify-between p-4 z-50">
        <h1 className="font-bold">Tytan HRIS</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileOpen(true)}
            className="text-fg-muted hover:text-fg"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-surface text-fg border-r border-border
          flex flex-col p-6 shadow-lg transition-all duration-300
          ${isCollapsed ? "w-20" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 z-50
        `}
      >
        {/* COLLAPSE + THEME TOGGLE */}
        <div
          className={`hidden md:flex items-center mb-4 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && <ThemeToggle />}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-fg-muted hover:text-fg"
          >
            {isCollapsed ? <Menu size={28} /> : <ArrowBigLeftDash size={20} />}
          </button>
        </div>

        {/* GREETING */}
        {!isCollapsed && (
          <div className="text-xl font-extrabold mb-8 capitalize text-fg">
            Hello! {username} ({role})
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-4 flex-1">
          {navGroups.map((group) => {
            const visibleChildren = group.children.filter((item) =>
              item.roles.includes(role),
            );

            if (!visibleChildren.length) return null;

            const isGroupActive = visibleChildren.some((item) =>
              isRouteActive(item.path),
            );

            return (
              <div key={group.label}>
                {/* PARENT */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors
                    ${
                      isGroupActive
                        ? "bg-primary/10 text-primary"
                        : "text-fg hover:bg-surface-hover"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {group.icon}
                    {!isCollapsed && <span>{group.label}</span>}
                  </div>

                  {!isCollapsed && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${
                        openGroup === group.label ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* CHILDREN */}
                {!isCollapsed && openGroup === group.label && (
                  <div className="ml-6 mt-2 flex flex-col gap-2">
                    {visibleChildren.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors
                          ${
                            isRouteActive(item.path)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-fg-muted hover:bg-surface-hover hover:text-fg"
                          }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* REMINDERS */}
        {isSuperAdmin && !isCollapsed && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-fg">
                Reminders ({reminders.length})
              </span>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary-hover"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="bg-surface-hover p-2 rounded-md text-xs flex justify-between gap-2"
                >
                  <span className="text-fg">{r.message}</span>
                  <span className="text-[10px] text-fg-muted capitalize font-bold whitespace-nowrap">
                    by {r.created_by_username || "Unknown"}
                  </span>
                  <button
                    onClick={() => handleResolve(r.id)}
                    className="text-danger hover:text-danger-hover"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-surface border border-border rounded-xl p-6 w-80 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 text-fg">
                Create Reminder
              </h2>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-2 rounded-lg border border-border bg-background text-fg mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows="3"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-fg-muted hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="bg-danger text-danger-foreground px-4 py-2 rounded-lg hover:bg-danger-hover mt-auto transition-colors"
        >
          {isCollapsed ? "⎋" : "Logout"}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
