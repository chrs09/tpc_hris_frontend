// Single source of truth for the sidebar's group -> pages structure,
// shared between Sidebar.jsx (renders the sidebar itself) and
// SectionTabs.jsx (renders the in-page tab bar for switching between a
// group's pages without going back to the sidebar). Icons are kept out
// of this file (JSX) and mapped by label in Sidebar.jsx instead.
//
// `role` only affects the "Trips" entry (drivers land on their own
// mobile-style trip screen instead of the admin trips table).
export function getNavGroups(role) {
  return [
    {
      label: "Dashboard",
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
          label: "Applicants",
          path: "/dashboard/applicants",
          roles: ["superadmin", "admin"],
          moduleKey: "hris.applicants",
        },
        {
          label: "Questionaire",
          path: "/dashboard/applicant/questionaire",
          roles: ["superadmin", "admin"],
          moduleKey: "hris.questionnaire",
        },
      ],
    },
    {
      label: "Payroll",
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
          label: "Trip Categories & Rates",
          path: "/dashboard/admin/trip-categories",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "trip_management.trip_categories",
        },
        {
          label: "Daily Dispatch Board",
          path: "/dashboard/admin/daily-deliveries",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "trip_management.daily_dispatch",
        },
      ],
    },
    {
      label: "Customers",
      children: [
        {
          label: "Customers",
          path: "/dashboard/admin/stores",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "customers.customers",
        },
      ],
    },
    {
      label: "Suppliers",
      children: [
        {
          label: "Suppliers",
          path: "/dashboard/admin/suppliers",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "suppliers.suppliers",
        },
      ],
    },
    {
      label: "Fleet Management",
      children: [
        {
          label: "Vehicle List",
          path: "/dashboard/admin/trip-maintenance?tab=units",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "fleet_management.vehicle_list",
        },
        {
          label: "Vehicle Maintenance",
          path: "/dashboard/admin/trip-maintenance?tab=maintenance",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "fleet_management.vehicle_maintenance",
        },
      ],
    },
    {
      label: "Finance",
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
      children: [
        { label: "Users", path: "/dashboard/users", roles: ["superadmin"] },
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
          label: "Error Logs",
          path: "/dashboard/error-logs",
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
}
