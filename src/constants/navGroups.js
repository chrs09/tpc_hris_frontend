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
            "coordinator",
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
        {
          label: "Work Schedules",
          path: "/dashboard/schedule-templates",
          roles: ["superadmin", "admin"],
          moduleKey: "hris.schedule_templates",
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
        {
          // How each department is paid (cutoff schedule) -- same access
          // as Payroll.
          label: "Payroll Cutoffs",
          path: "/dashboard/payroll-cutoffs",
          roles: ["superadmin", "payroll_admin"],
          moduleKey: "payroll.payroll",
        },
        {
          // Read-only: every SSS pay range with its deduction, plus the
          // PhilHealth / Pag-IBIG / tax rules payroll uses.
          label: "Contribution Tables",
          path: "/dashboard/contribution-tables",
          roles: ["superadmin", "payroll_admin"],
          moduleKey: "payroll.payroll",
        },
      ],
    },
    {
      label: "Approvals",
      // One page, a tab per kind of approval (pages/Approvals). Each tab is
      // shown to whoever could use that approval before: the module/role,
      // or an Org Chart head who approves that kind (approverKind).
      children: [
        {
          label: "Attendance",
          path: "/dashboard/approvals?tab=attendance",
          roles: ["superadmin"],
          moduleKey: "hris.attendance_grid_view",
          approverKind: "attendance",
        },
        {
          label: "Cash Advance",
          path: "/dashboard/approvals?tab=cash_advance",
          roles: ["superadmin"],
          moduleKey: "finance.cash_advance",
          approverKind: "cash_advance",
        },
        {
          // Immediate heads (Reporting Hierarchy) and Org Chart heads
          // with Overtime ticked -- see requiresDepartmentHead.
          label: "Overtime",
          path: "/dashboard/approvals?tab=overtime",
          roles: [],
          requiresDepartmentHead: true,
        },
        {
          label: "Leave",
          path: "/dashboard/approvals?tab=leave",
          roles: ["superadmin", "admin"],
          moduleKey: "hris.leave",
        },
      ],
    },
    {
      label: "Trip Management",
      children: [
        {
          label: "Dashboard",
          path: "/dashboard/admin/trip-dashboard",
          roles: ["superadmin", "coordinator_admin", "coordinator"],
          moduleKey: "trip_management.trip_dashboard",
        },
        {
          label: "Trip Assignment",
          path: "/dashboard/admin/trip-assignment",
          roles: ["superadmin", "coordinator_admin", "coordinator"],
          moduleKey: "trip_management.trip_assignment",
        },
        {
          label: "Trip Approvals",
          path:
            role === "driver"
              ? "/dashboard/driver/trips"
              : "/dashboard/admin/trips",
          roles: ["superadmin", "driver", "coordinator_admin"],
          moduleKey: "trip_management.trips",
        },
        {
          label: "Trip Confirmation",
          path: "/dashboard/office/trips",
          roles: ["superadmin", "coordinator_admin", "office_admin"],
          moduleKey: "trip_management.office_trip_review",
        },
        {
          label: "Trip Category & Rates",
          path: "/dashboard/admin/trip-categories",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "trip_management.trip_categories",
        },
        {
          label: "Origins",
          path: "/dashboard/admin/origins",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "trip_management.origins",
        },
        {
          label: "Trip Dispatch",
          path: "/dashboard/admin/daily-deliveries",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "trip_management.daily_dispatch",
        },
        {
          // Role-based default is superadmin-only; "selected users" get
          // in via Module Assignment granting trip_bypass_actions, same
          // pattern as Attendance's Grid View / List View sub-permissions.
          label: "Trip Bypass",
          path: "/dashboard/admin/trip-bypass",
          roles: ["superadmin"],
          moduleKey: "trip_management.trip_bypass_actions",
        },
        {
          // Superadmin + coordinator_admin (no moduleKey, so it can't be
          // granted to anyone else via Module Assignment). Only superadmin
          // approves coordinator_admin entries.
          label: "Trip Manual Entries",
          path: "/dashboard/admin/trip-manual-entries",
          roles: ["superadmin", "coordinator_admin"],
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
        {
          label: "Fuel Requests",
          path: "/dashboard/admin/fuel-requests",
          roles: ["superadmin", "coordinator_admin"],
          moduleKey: "fleet_management.fuel_requests",
        },
      ],
    },
    {
      label: "Cash Advance",
      children: [
        {
          // Self-service filing -- every role except superadmin can file
          // (see app/api/cash_advance_request.py's file_cash_advance_request),
          // so this is deliberately not gated behind a moduleKey the same
          // way Dashboard/Overview isn't.
          label: "Cash Advance",
          path: "/dashboard/cash-advance",
          roles: [
            "admin",
            "driver",
            "helper",
            "employee",
            "payroll_admin",
            "coordinator_admin",
            "coordinator",
            "office_admin",
          ],
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
          // Banks offered on the employee 201 form (Bank Type).
          label: "Bank Master",
          path: "/dashboard/finance/banks",
          roles: ["superadmin"],
          moduleKey: "finance.bank_master",
        },
      ],
    },
    {
      label: "Administrator",
      children: [
        {
          label: "Users",
          path: "/dashboard/users",
          roles: ["superadmin"],
          moduleKey: "administrator.users",
        },
        {
          label: "Hierarchy",
          path: "/dashboard/hierarchy",
          roles: ["superadmin"],
          moduleKey: "administrator.hierarchy",
        },
        {
          // Same access as Hierarchy (it's a visual view of it). Only a
          // real superadmin can change a head's module access from here.
          label: "Org Chart",
          path: "/dashboard/org-chart",
          roles: ["superadmin"],
          moduleKey: "administrator.hierarchy",
        },
        {
          // Not module-grantable -- see modules.js: granting this would
          // let a non-superadmin grant themselves further access.
          label: "Module Assignment",
          path: "/dashboard/module-assignment",
          roles: ["superadmin"],
        },
        {
          label: "Role Access",
          path: "/dashboard/role-access",
          roles: ["superadmin"],
          moduleKey: "administrator.role_access",
        },
        {
          label: "Cash Advance Settings",
          path: "/dashboard/cash-advance-settings",
          roles: ["superadmin"],
          moduleKey: "administrator.cash_advance_settings",
        },
        {
          label: "Holidays",
          path: "/dashboard/holidays",
          roles: ["superadmin"],
          moduleKey: "administrator.holidays",
        },
        {
          label: "Error Logs",
          path: "/dashboard/error-logs",
          roles: ["superadmin"],
          moduleKey: "administrator.error_logs",
        },
        {
          label: "Tickets",
          path: "/dashboard/tickets",
          roles: ["superadmin"],
          moduleKey: "administrator.tickets",
        },
        {
          label: "Settings",
          path: "/dashboard/settings",
          roles: ["superadmin"],
          moduleKey: "administrator.settings",
        },
      ],
    },
  ];
}
