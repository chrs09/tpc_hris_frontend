// Which payroll group an employee is paid in: their department, plus
// their payroll type for groups that split a department (Admin monthly /
// Admin daily). Same rule as the backend (app/services/payroll_groups.py).

export const PAY_BASES = {
  fixed_monthly: "Fixed monthly",
  fixed_daily: "Fixed daily",
  per_trip_driver: "Per trip (driver)",
  per_trip_helper: "Per trip (helper)",
};

export const isTripBasis = (basis) =>
  basis === "per_trip_driver" || basis === "per_trip_helper";

// Anything that isn't Monthly is paid daily.
export const normalizePayrollType = (value) =>
  String(value || "").trim().toLowerCase() === "monthly" ? "Monthly" : "Daily";

export const groupFor = (groups, department, payrollType) => {
  const dept = String(department || "").trim().toLowerCase();
  if (!dept) return null;
  const kind = normalizePayrollType(payrollType);
  return (
    (groups || []).find(
      (g) =>
        g.departments.some((d) => d.toLowerCase() === dept) &&
        (!g.payroll_type || g.payroll_type === kind),
    ) || null
  );
};
