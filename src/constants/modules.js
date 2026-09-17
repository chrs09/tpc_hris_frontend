// Canonical assignable module/submodule structure. Keys MUST match
// MODULE_GROUPS in tpc_hris_backend/app/api/employee_module_access.py.
// Used by both the Sidebar (to decide what a non-superadmin user can see)
// and the Module Assignment page (to render the checkbox grid). Dashboard
// stays always-visible and is not part of this list. Module Assignment
// itself is deliberately left out of the "administrator" group below --
// granting it would let a non-superadmin grant themselves (or anyone)
// further access, a privilege-escalation loop -- it stays hardcoded
// superadmin-only.
export const MODULE_GROUPS = [
  {
    key: "hris",
    label: "HRIS",
    submodules: [
      {
        key: "attendance",
        label: "Attendance",
        path: "/dashboard/attendance",
        // Sub-permissions within the Attendance page itself -- lets an
        // employee be granted just one of the two view modes instead of
        // the whole page (see AttendanceList.jsx's canSeeListView /
        // canSeeGridView). Not a nav item on its own, so no `path`.
        children: [
          { key: "attendance_list_view", label: "Attendance List" },
          { key: "attendance_grid_view", label: "Grid View" },
        ],
      },
      { key: "leave", label: "Leave Requests", path: "/dashboard/leave" },
      { key: "employees", label: "Employees", path: "/dashboard/employees" },
      { key: "applicants", label: "Applicants", path: "/dashboard/applicants" },
      {
        key: "questionnaire",
        label: "Questionaire",
        path: "/dashboard/applicant/questionaire",
      },
      {
        key: "schedule_templates",
        label: "Work Schedules",
        path: "/dashboard/schedule-templates",
      },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    submodules: [{ key: "payroll", label: "Payroll", path: "/dashboard/payroll" }],
  },
  {
    key: "trip_management",
    label: "Trip Management",
    submodules: [
      {
        key: "trip_dashboard",
        label: "Dashboard",
        path: "/dashboard/admin/trip-dashboard",
      },
      {
        key: "trip_assignment",
        label: "Trip Assignment",
        path: "/dashboard/admin/trip-assignment",
      },
      {
        key: "trips",
        label: "Trip Approvals",
        path: "/dashboard/admin/trips",
      },
      {
        key: "office_trip_review",
        label: "Trip Confirmation",
        path: "/dashboard/office/trips",
      },
      {
        key: "trip_categories",
        label: "Trip Category & Rates",
        path: "/dashboard/admin/trip-categories",
      },
      {
        key: "origins",
        label: "Origins",
        path: "/dashboard/admin/origins",
      },
      {
        key: "daily_dispatch",
        label: "Trip Dispatch",
        path: "/dashboard/admin/daily-deliveries",
      },
      {
        key: "trip_bypass_actions",
        label: "Trip Bypass",
        path: "/dashboard/admin/trip-bypass",
      },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    submodules: [
      { key: "customers", label: "Customers", path: "/dashboard/admin/stores" },
    ],
  },
  {
    key: "suppliers",
    label: "Suppliers",
    submodules: [
      { key: "suppliers", label: "Suppliers", path: "/dashboard/admin/suppliers" },
    ],
  },
  {
    key: "fleet_management",
    label: "Fleet Management",
    submodules: [
      {
        key: "vehicle_list",
        label: "Vehicle List",
        path: "/dashboard/admin/trip-maintenance?tab=units",
      },
      {
        key: "vehicle_maintenance",
        label: "Vehicle Maintenance",
        path: "/dashboard/admin/trip-maintenance?tab=maintenance",
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    submodules: [
      {
        key: "finance_trips",
        label: "Trip Review",
        path: "/dashboard/finance/trips",
      },
      {
        key: "finance_expenses",
        label: "Expenses",
        path: "/dashboard/finance/expenses",
      },
      {
        key: "cash_advance",
        label: "Cash Advances",
        path: "/dashboard/cash-advance-approvals",
      },
    ],
  },
  {
    key: "administrator",
    label: "Administrator",
    submodules: [
      { key: "users", label: "Users", path: "/dashboard/users" },
      { key: "hierarchy", label: "Hierarchy", path: "/dashboard/hierarchy" },
      { key: "role_access", label: "Role Access", path: "/dashboard/role-access" },
      {
        key: "cash_advance_settings",
        label: "Cash Advance Settings",
        path: "/dashboard/cash-advance-settings",
      },
      { key: "holidays", label: "Holidays", path: "/dashboard/holidays" },
      { key: "error_logs", label: "Error Logs", path: "/dashboard/error-logs" },
      { key: "tickets", label: "Tickets", path: "/dashboard/tickets" },
      { key: "settings", label: "Settings", path: "/dashboard/settings" },
    ],
  },
];

export const moduleKey = (groupKey, subKey) => `${groupKey}.${subKey}`;
