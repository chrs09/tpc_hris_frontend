import React, { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  LayoutDashboard,
  Users,
  Truck,
  Shield,
  Wallet,
  Landmark,
  Building2,
  LogOut,
  LifeBuoy,
} from "lucide-react";
import { logout } from "../utils/auth";
import { getUserList, impersonateUser } from "../api/users";
import { startImpersonation } from "../utils/impersonation";
import { getNavGroups } from "../constants/navGroups";
import useModuleAccess from "../hooks/useModuleAccess";
import ThemeCustomizer from "./ui/ThemeCustomizer";
import HubAlertsBell from "./adminTrips/HubAlertsBell";
import CashAdvanceAlertsBell from "./adminTrips/CashAdvanceAlertsBell";
import ManualEntryAlertsBell from "./adminTrips/ManualEntryAlertsBell";
import GeofenceAlertsBell from "./attendance/GeofenceAlertsBell";
import FuelRequestAlertsBell from "./adminTrips/FuelRequestAlertsBell";
import LeaveAlertsBell from "./leave/LeaveAlertsBell";
import TripCancelAlertsBell from "./adminTrips/TripCancelAlertsBell";
import toast from "react-hot-toast";

// Icon components are kept here rather than in the shared navGroups data
// file, mapped onto each group by label (sized when rendered).
const GROUP_ICONS = {
  Dashboard: LayoutDashboard,
  HRIS: Users,
  Payroll: Wallet,
  Approvals: Users,
  "Trip Management": Truck,
  Customers: Users,
  Suppliers: Building2,
  "Fleet Management": Truck,
  "Cash Advance": Wallet,
  Finance: Landmark,
  Tickets: LifeBuoy,
  Administrator: Shield,
};

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const username = localStorage.getItem("username");
  // Greeting: the person's full name (saved at login), else the username.
  const displayName = localStorage.getItem("full_name") || username;
  const { role, isSuperAdmin, isVisible } = useModuleAccess();

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
        (u.employee_name || "").toLowerCase().includes(viewAsSearch.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(viewAsSearch.toLowerCase())),
  );

  // =========================
  // ✅ ROUTE MATCH HELPER (CLEAN FIX)
  // =========================
  const isRouteActive = useCallback(
    (path) => {
      // Strip any query string (e.g. "?tab=units") -- route matching is
      // pathname-only, so two sidebar items that point at the same page
      // with different tabs (Fleet Management's Vehicle List / Vehicle
      // Maintenance) both register as "in this section" together.
      const pathname = path.split("?")[0];

      if (pathname === "/dashboard") {
        return location.pathname === pathname;
      }
      return location.pathname.startsWith(pathname);
    },
    [location.pathname],
  );

  // =========================
  // NAV GROUPS (shared with SectionTabs.jsx -- see src/constants/navGroups.js)
  // =========================
  // Collapsed: icon only, larger and centred.
  const linkLayout = isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2";
  const renderIcon = (Icon) =>
    Icon ? <Icon size={isCollapsed ? 22 : 18} className="shrink-0" /> : null;

  const navGroups = useMemo(
    () =>
      getNavGroups(role).map((group) => ({
        ...group,
        icon: GROUP_ICONS[group.label],
      })),
    [role],
  );

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-surface text-fg border-b border-border flex items-center justify-between p-4 z-50">
        <h1 className="font-bold">Tytan HRIS</h1>
        <div className="flex items-center gap-3">
          <HubAlertsBell />
          <CashAdvanceAlertsBell />
          <ManualEntryAlertsBell />
          <GeofenceAlertsBell />
          <FuelRequestAlertsBell />
          <LeaveAlertsBell />
          <TripCancelAlertsBell />
          <ThemeCustomizer />
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
          flex flex-col shadow-lg transition-all duration-300 overflow-hidden
          ${isCollapsed ? "w-20 px-3 py-6" : "w-64 p-6"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 z-50
        `}
      >
        {/* THEME + NOTIFICATION BELLS */}
        <div
          className={`hidden md:flex shrink-0 items-center mb-4 ${
            isCollapsed ? "flex-col gap-3" : ""
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <ThemeCustomizer />
              <HubAlertsBell />
              <CashAdvanceAlertsBell />
              <ManualEntryAlertsBell />
              <GeofenceAlertsBell />
              <FuelRequestAlertsBell />
              <LeaveAlertsBell />
              <TripCancelAlertsBell />
            </div>
          )}
          {isCollapsed && (
            <div className="flex flex-col items-center gap-3">
              <HubAlertsBell />
              <CashAdvanceAlertsBell />
              <ManualEntryAlertsBell />
              <GeofenceAlertsBell />
              <FuelRequestAlertsBell />
              <LeaveAlertsBell />
              <TripCancelAlertsBell />
            </div>
          )}
        </div>

        {/* SCROLLABLE MIDDLE (greeting + nav) -- kept separate
            from the header/logout so a tall nav (many visible groups) or
            a high browser zoom level scrolls internally instead of
            overflowing/breaking the fixed-height aside. */}
        <div className="flex-1 min-h-0 overflow-y-auto -mr-3 pr-3">
          {/* GREETING */}
          {!isCollapsed && (
            <div className="mb-8">
              <div className="text-xl font-extrabold capitalize text-fg">
                Hello! {displayName} ({role})
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
          <nav className="flex flex-col gap-4">
          {navGroups.map((group) => {
            // Items without a moduleKey (Dashboard, OT Approvals,
            // Administrator) are always role-based, unaffected by Module
            // Assignment. See useModuleAccess for the full rule (shared
            // with SectionTabs.jsx).
            const visibleChildren = group.children.filter(isVisible);

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
                  title={group.label}
                  className={`flex items-center gap-2 rounded-lg ${linkLayout} transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-fg hover:bg-surface-hover"
                  }`}
                >
                  {renderIcon(group.icon)}
                  {!isCollapsed && <span>{group.label}</span>}
                </Link>
              );
            }

            // Clicking a multi-page group always goes straight to its
            // first visible page -- switching between the group's other
            // pages happens via the SectionTabs bar at the top of each
            // of those pages, not a sidebar dropdown.
            const activeChild = visibleChildren.find((item) =>
              isRouteActive(item.path),
            );
            const isGroupActive = Boolean(activeChild);

            return (
              <Link
                key={group.label}
                to={visibleChildren[0].path}
                onClick={() => setIsMobileOpen(false)}
                title={
                  isGroupActive
                    ? `${group.label} / ${activeChild.label}`
                    : group.label
                }
                className={`flex min-w-0 items-center gap-2 rounded-lg ${linkLayout} transition-colors ${
                  isGroupActive
                    ? "bg-primary/10 text-primary"
                    : "text-fg hover:bg-surface-hover"
                }`}
              >
                {renderIcon(group.icon)}
                {!isCollapsed && (
                  <span className="truncate text-sm font-medium">
                    {group.label}
                    {isGroupActive && (
                      <>
                        <span className="mx-1 text-primary/50">/</span>
                        {activeChild.label}
                      </>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        </div>

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
                      {viewAsPendingUser.employee_name ||
                        viewAsPendingUser.username}
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
                    placeholder="Search name, username, or email..."
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
                              {u.employee_name || u.username}
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
          title="Logout"
          className={`mt-auto flex items-center justify-center rounded-lg bg-danger text-danger-foreground transition-colors hover:bg-danger-hover ${
            isCollapsed ? "py-2.5" : "px-4 py-2"
          }`}
        >
          {isCollapsed ? <LogOut size={20} /> : "Logout"}
        </button>
      </aside>

      {/* COLLAPSE HANDLE (desktop) -- a pull tab on the sidebar's edge,
          outside the aside so its overflow-hidden doesn't clip it. */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`fixed top-1/2 z-50 hidden h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-border bg-surface text-fg-muted shadow-md transition-all duration-300 hover:w-6 hover:bg-surface-hover hover:text-primary md:flex ${
          isCollapsed ? "left-20" : "left-64"
        }`}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </>
  );
};

export default Sidebar;
