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
import { getMyModuleAccess } from "../api/employeeModuleAccess";
import { getUserList, impersonateUser } from "../api/users";
import { startImpersonation } from "../utils/impersonation";
import ThemeToggle from "./ui/ThemeToggle";
import HubAlertsBell from "./adminTrips/HubAlertsBell";
import CashAdvanceAlertsBell from "./adminTrips/CashAdvanceAlertsBell";
import toast from "react-hot-toast";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Which multi-page group's breadcrumb switcher flyout is open (null = none).
  const [openSwitcherGroup, setOpenSwitcherGroup] = useState(null);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const isSuperAdmin = role === "superadmin";

  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Per-employee submodule grants (Module Assignment page). Once
  // superadmin has explicitly configured an employee (hasCustomAccess),
  // their access to the assignable groups (items with a moduleKey) comes
  // ONLY from grantedModules -- role no longer grants anything for those
  // items, even if the granted set is empty. Until configured, role-based
  // access applies as before. Not needed for superadmin, who always sees
  // everything.
  const [grantedModules, setGrantedModules] = useState(new Set());
  const [hasCustomAccess, setHasCustomAccess] = useState(false);

  // "View As" -- superadmin picks another user to see their live,
  // read-only view (Sidebar, dashboards, data), lives in the greeting
  // area instead of the Users table. All writes are blocked centrally
  // in api/services/api.js while a view-as session is active.
  const [showViewAsModal, setShowViewAsModal] = useState(false);
  const [viewAsUsers, setViewAsUsers] = useState([]);
  const [viewAsLoading, setViewAsLoading] = useState(false);
  const [viewAsSearch, setViewAsSearch] = useState("");
  // Set once a candidate is picked, turning the modal into a confirm
  // step (in-modal, no browser confirm()) before actually switching.
  const [viewAsPendingUser, setViewAsPendingUser] = useState(null);
  const [viewAsSubmitting, setViewAsSubmitting] = useState(false);

  const openViewAsModal = () => {
    setShowViewAsModal(true);
    setViewAsSearch("");
    setViewAsPendingUser(null);
    setViewAsLoading(true);
    getUserList()
      .then((data) => setViewAsUsers(data))
      .catch(() => toast.error("Failed to load users."))
      .finally(() => setViewAsLoading(false));
  };

  const closeViewAsModal = () => {
    setShowViewAsModal(false);
    setViewAsPendingUser(null);
  };

  const confirmViewAs = async () => {
    if (!viewAsPendingUser) return;
    setViewAsSubmitting(true);
    try {
      const data = await impersonateUser(viewAsPendingUser.id);
      startImpersonation(data);
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to view as user.");
      setViewAsSubmitting(false);
    }
  };

  const viewAsCandidates = viewAsUsers.filter(
    (u) =>
      u.role !== "superadmin" &&
      u.is_active &&
      (u.username.toLowerCase().includes(viewAsSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(viewAsSearch.toLowerCase())),
  );

  useEffect(() => {
    if (isSuperAdmin) return;
    getMyModuleAccess()
      .then((data) => {
        setGrantedModules(new Set(data.module_keys || []));
        setHasCustomAccess(Boolean(data.has_custom_access));
      })
      .catch(() => {
        setGrantedModules(new Set());
        setHasCustomAccess(false);
      });
  }, [isSuperAdmin]);

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
            moduleKey: "hris.attendance",
          },
          {
            label: "Leave Requests",
            path: "/dashboard/leave",
            roles: ["superadmin", "admin"],
            moduleKey: "hris.leave",
          },
          {
            label: "Employees",
            path: "/dashboard/employees",
            roles: ["superadmin", "admin"],
            moduleKey: "hris.employees",
          },
          {
            label: "Applicants", // ✅ ADD THIS
            path: "/dashboard/applicants",
            roles: ["superadmin", "admin"],
            moduleKey: "hris.applicants",
          },
          {
            label: "Questionaire", // ✅ ADD THIS
            path: "/dashboard/applicant/questionaire",
            roles: ["superadmin", "admin"],
            moduleKey: "hris.questionnaire",
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
            moduleKey: "payroll.payroll",
          },
        ],
      },
      {
        label: "OT Approvals",
        icon: <Users size={18} />,
        children: [
          {
            label: "OT Approvals",
            path: "/dashboard/overtime-approvals",
            // Visible to everyone -- eligibility is data-driven (you're
            // either the request's designated approver or the requester's
            // department head), not role-based.
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
            moduleKey: "trip_management.trips",
          },
          {
            label: "Office Trip Review",
            path: "/dashboard/office/trips",
            roles: ["superadmin", "coordinator_admin", "office_admin"],
            moduleKey: "trip_management.office_trip_review",
          },
          {
            label: "Start Trip (Bypass)",
            path: "/dashboard/admin/trip-bypass",
            roles: ["superadmin", "coordinator_admin"],
            moduleKey: "trip_management.trip_bypass",
          },
          {
            label: "Maintenance",
            path: "/dashboard/admin/trip-maintenance",
            roles: ["superadmin", "coordinator_admin"],
            moduleKey: "trip_management.maintenance",
          },
          {
            label: "Stores",
            path: "/dashboard/admin/stores",
            roles: ["superadmin", "coordinator_admin"],
            moduleKey: "trip_management.stores",
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
            moduleKey: "trip_management.daily_dispatch",
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
            moduleKey: "finance.finance_trips",
          },
          {
            label: "Expenses",
            path: "/dashboard/finance/expenses",
            roles: ["superadmin"],
            moduleKey: "finance.finance_expenses",
          },
          {
            label: "Cash Advance Approvals",
            path: "/dashboard/cash-advance-approvals",
            roles: ["superadmin"],
            moduleKey: "finance.cash_advance",
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
            label: "Hierarchy",
            path: "/dashboard/hierarchy",
            roles: ["superadmin"],
          },
          {
            label: "Module Assignment",
            path: "/dashboard/module-assignment",
            roles: ["superadmin"],
          },
          {
            label: "Role Access",
            path: "/dashboard/role-access",
            roles: ["superadmin"],
          },
          {
            label: "Cash Advance Settings",
            path: "/dashboard/cash-advance-settings",
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

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-surface text-fg border-b border-border flex items-center justify-between p-4 z-50">
        <h1 className="font-bold">Tytan HRIS</h1>
        <div className="flex items-center gap-3">
          <HubAlertsBell />
          <CashAdvanceAlertsBell />
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
        {/* COLLAPSE + THEME TOGGLE + NOTIFICATION BELLS */}
        <div
          className={`hidden md:flex items-center mb-4 ${
            isCollapsed ? "flex-col gap-3" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <HubAlertsBell />
              <CashAdvanceAlertsBell />
            </div>
          )}
          {isCollapsed && (
            <div className="flex flex-col items-center gap-3">
              <HubAlertsBell />
              <CashAdvanceAlertsBell />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-fg-muted hover:text-fg"
          >
            {isCollapsed ? <Menu size={28} /> : <ArrowBigLeftDash size={20} />}
          </button>
        </div>

        {/* GREETING */}
        {!isCollapsed && (
          <div className="mb-8">
            <div className="text-xl font-extrabold capitalize text-fg">
              Hello! {username} ({role})
            </div>
            {isSuperAdmin && (
              <button
                onClick={openViewAsModal}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                View As...
              </button>
            )}
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-4 flex-1">
          {navGroups.map((group) => {
            // Items without a moduleKey (Dashboard, OT Approvals,
            // Administrator) are always role-based, unaffected by Module
            // Assignment. For items WITH a moduleKey: once this employee
            // has been explicitly configured (hasCustomAccess), their
            // role grants nothing here -- only grantedModules decides,
            // so a restriction (e.g. Trips only) actually restricts.
            // Until configured, role-based access applies as before.
            const visibleChildren = group.children.filter((item) => {
              if (role === "superadmin") return true;
              if (!item.moduleKey) return item.roles.includes(role);
              if (hasCustomAccess) return grantedModules.has(item.moduleKey);
              return item.roles.includes(role);
            });

            if (!visibleChildren.length) return null;

            // A single-page group (e.g. Dashboard, Payroll) is just a
            // plain link -- there's no separate section to break out of.
            if (visibleChildren.length === 1) {
              const only = visibleChildren[0];
              const active = isRouteActive(only.path);

              return (
                <Link
                  key={group.label}
                  to={only.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-fg hover:bg-surface-hover"
                  }`}
                >
                  {group.icon}
                  {!isCollapsed && <span>{group.label}</span>}
                </Link>
              );
            }

            const activeChild = visibleChildren.find((item) =>
              isRouteActive(item.path),
            );
            const isGroupActive = Boolean(activeChild);
            const isSwitcherOpen = openSwitcherGroup === group.label;

            return (
              <div key={group.label}>
                {isGroupActive ? (
                  // BREADCRUMB: "Group / current page" instead of a
                  // click-to-expand dropdown. The breadcrumb itself links
                  // back to the group's first page; the chevron opens a
                  // small flyout to switch to a sibling page.
                  <div className="flex items-center justify-between gap-1 rounded-lg bg-primary/10 px-3 py-2 text-primary">
                    <Link
                      to={visibleChildren[0].path}
                      onClick={() => setIsMobileOpen(false)}
                      title={`${group.label} / ${activeChild.label}`}
                      className="flex min-w-0 items-center gap-2"
                    >
                      {group.icon}
                      {!isCollapsed && (
                        <span className="truncate text-sm font-medium">
                          {group.label}
                          <span className="mx-1 text-primary/50">/</span>
                          {activeChild.label}
                        </span>
                      )}
                    </Link>

                    {!isCollapsed && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSwitcherGroup(isSwitcherOpen ? null : group.label)
                        }
                        aria-label={`Switch page within ${group.label}`}
                        className="shrink-0 rounded p-1 hover:bg-primary/15"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${
                            isSwitcherOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>
                ) : (
                  // Not currently inside this group -- clicking it takes
                  // you to its first page.
                  <Link
                    to={visibleChildren[0].path}
                    onClick={() => setIsMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-fg transition-colors hover:bg-surface-hover"
                  >
                    {group.icon}
                    {!isCollapsed && <span>{group.label}</span>}
                  </Link>
                )}

                {/* SWITCHER FLYOUT */}
                {isGroupActive && !isCollapsed && isSwitcherOpen && (
                  <div className="ml-6 mt-2 flex flex-col gap-2">
                    {visibleChildren.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setIsMobileOpen(false);
                          setOpenSwitcherGroup(null);
                        }}
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

        {/* VIEW AS MODAL */}
        {showViewAsModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
              {viewAsPendingUser ? (
                // ================= CONFIRM STEP =================
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-fg">
                      Confirm View As
                    </h2>
                    <button
                      onClick={closeViewAsModal}
                      disabled={viewAsSubmitting}
                      className="text-fg-muted hover:text-fg disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-sm text-fg mb-2">
                    View as{" "}
                    <span className="font-semibold capitalize">
                      {viewAsPendingUser.username}
                    </span>{" "}
                    <span className="text-fg-subtle capitalize">
                      ({viewAsPendingUser.role})
                    </span>
                    ?
                  </p>
                  <p className="text-xs text-fg-subtle mb-6">
                    You'll see their live data exactly as they see it, in
                    read-only mode -- no changes can be saved. Use "Return to
                    Superadmin" in the banner to come back.
                  </p>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setViewAsPendingUser(null)}
                      disabled={viewAsSubmitting}
                      className="px-3 py-1.5 rounded-lg text-sm text-fg-muted hover:bg-surface-hover disabled:opacity-40"
                    >
                      Back
                    </button>
                    <button
                      onClick={confirmViewAs}
                      disabled={viewAsSubmitting}
                      className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                    >
                      {viewAsSubmitting ? "Switching..." : "View As"}
                    </button>
                  </div>
                </>
              ) : (
                // ================= PICK USER STEP =================
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-fg">View As</h2>
                    <button
                      onClick={closeViewAsModal}
                      className="text-fg-muted hover:text-fg"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-fg-subtle mb-3">
                    You'll see their live data in read-only mode. No changes
                    can be made while viewing as another account.
                  </p>

                  <input
                    type="text"
                    autoFocus
                    placeholder="Search username or email..."
                    value={viewAsSearch}
                    onChange={(e) => setViewAsSearch(e.target.value)}
                    className="w-full p-2 rounded-lg border border-border bg-background text-fg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />

                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {viewAsLoading ? (
                      <div className="text-sm text-fg-subtle text-center py-4">
                        Loading users...
                      </div>
                    ) : viewAsCandidates.length === 0 ? (
                      <div className="text-sm text-fg-subtle text-center py-4">
                        No matching users.
                      </div>
                    ) : (
                      viewAsCandidates.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setViewAsPendingUser(u)}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-hover"
                        >
                          <span>
                            <span className="font-medium text-fg capitalize">
                              {u.username}
                            </span>
                            <span className="ml-2 text-xs text-fg-subtle capitalize">
                              ({u.role})
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
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
