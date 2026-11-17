import api from "../services/api";

// Payroll Cutoffs: how each department is paid (semi-monthly, weekly or
// monthly) -- the Payroll page builds its cutoff periods from these.
export const getPayrollCutoffRules = async () => {
  const res = await api.get("/payroll-cutoffs");
  return res.data;
};

export const savePayrollCutoffRule = async (department, rule) => {
  const res = await api.put(
    `/payroll-cutoffs/${encodeURIComponent(department)}`,
    rule,
  );
  return res.data;
};

export const deletePayrollCutoffRule = async (department) => {
  const res = await api.delete(
    `/payroll-cutoffs/${encodeURIComponent(department)}`,
  );
  return res.data;
};

// Pay periods with paydays for the trip filters (any login):
// { mine: { group, periods } | null, groups: [{ group, periods }] }
// period: { from, to, payout, label: "Oct 16 - Oct 31, 2026 · Payday Nov 15" }
export const getTripPeriods = async () => {
  const res = await api.get("/payroll-cutoffs/trip-periods");
  return res.data;
};
