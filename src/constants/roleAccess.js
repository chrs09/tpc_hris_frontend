// Read-only mirror of every nav group/item + role list defined in
// src/components/Sidebar.jsx, used by the Role Access viewer page
// (src/pages/Admin/RoleAccess.jsx) so superadmin can pick a role and see
// exactly what it currently grants. This is NOT the source of truth --
// Sidebar.jsx's `roles` arrays are -- so if you change access there,
// mirror the change here too, or this viewer will drift out of sync.
export const ROLE_ACCESS_GROUPS = [
  {
    label: "Dashboard",
    children: [
      {
        label: "Overview",
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
      { label: "Attendance", roles: ["superadmin", "admin"] },
      { label: "Leave Requests", roles: ["superadmin", "admin"] },
      { label: "Employees", roles: ["superadmin", "admin"] },
      { label: "Applicants", roles: ["superadmin", "admin"] },
      { label: "Questionaire", roles: ["superadmin", "admin"] },
    ],
  },
  {
    label: "Payroll",
    children: [
      { label: "Payroll", roles: ["superadmin", "payroll_admin"] },
    ],
  },
  {
    label: "OT Approvals",
    children: [
      {
        label: "OT Approvals",
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
        roles: ["superadmin", "driver", "coordinator_admin"],
      },
      {
        label: "Office Trip Review",
        roles: ["superadmin", "coordinator_admin", "office_admin"],
      },
      {
        label: "Start Trip (Bypass)",
        roles: ["superadmin", "coordinator_admin"],
      },
      { label: "Maintenance", roles: ["superadmin", "coordinator_admin"] },
      { label: "Stores", roles: ["superadmin", "coordinator_admin"] },
      {
        label: "Daily Dispatch Board",
        roles: ["superadmin", "coordinator_admin"],
      },
    ],
  },
  {
    label: "Finance",
    children: [
      { label: "Trip Review", roles: ["superadmin"] },
      { label: "Expenses", roles: ["superadmin"] },
      { label: "Cash Advance Approvals", roles: ["superadmin"] },
    ],
  },
  {
    label: "Administrator",
    children: [
      { label: "Users", roles: ["superadmin"] },
      { label: "Hierarchy", roles: ["superadmin"] },
      { label: "Module Assignment", roles: ["superadmin"] },
      { label: "Role Access", roles: ["superadmin"] },
      { label: "Cash Advance Settings", roles: ["superadmin"] },
      { label: "Holidays", roles: ["superadmin"] },
      { label: "Settings", roles: ["superadmin"] },
    ],
  },
];

export const ALL_ROLES = [
  "superadmin",
  "admin",
  "driver",
  "helper",
  "employee",
  "coordinator_admin",
  "payroll_admin",
  "office_admin",
];

export const roleLabel = (role) =>
  role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
