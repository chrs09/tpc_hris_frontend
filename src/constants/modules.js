// Canonical assignable module/submodule structure. Keys MUST match
// MODULE_GROUPS in tpc_hris_backend/app/api/employee_module_access.py.
// Used by both the Sidebar (to decide what a non-superadmin user can see)
// and the Module Assignment page (to render the checkbox grid). Dashboard
// and Administrator are intentionally not part of this list -- Dashboard
// stays always-visible, Administrator stays hardcoded superadmin-only.
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
      { key: "trips", label: "Trips", path: "/dashboard/admin/trips" },
      {
        key: "office_trip_review",
        label: "Office Trip Review",
        path: "/dashboard/office/trips",
      },
      {
        key: "trip_bypass",
        label: "Start Trip (Bypass)",
        path: "/dashboard/admin/trip-bypass",
      },
      {
        key: "trip_categories",
        label: "Trip Categories & Rates",
        path: "/dashboard/admin/trip-categories",
      },
      {
        key: "daily_dispatch",
        label: "Daily Dispatch Board",
        path: "/dashboard/admin/daily-deliveries",
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
];

export const moduleKey = (groupKey, subKey) => `${groupKey}.${subKey}`;
