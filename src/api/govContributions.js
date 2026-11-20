import api from "./services/api";

// HRIS -> Government Contributions (backend: app/api/gov_contributions.py):
// every employee's SSS / PhilHealth / Pag-IBIG / TIN and which
// contributions payroll deducts (has_sss, has_philhealth, has_pagibig,
// has_tax).

export const getGovContributions = async (includeInactive = false) => {
  const res = await api.get("/government-contributions", {
    params: { include_inactive: includeInactive },
  });
  return res.data;
};

// Partial: any of the numbers and has_* ticks.
export const updateGovContribution = async (employeeId, payload) => {
  const res = await api.put(`/government-contributions/${employeeId}`, payload);
  return res.data;
};

// One tick for many employees: flag = has_sss | has_philhealth | ...
export const bulkUpdateGovContributions = async (employeeIds, flag, value) => {
  const res = await api.put("/government-contributions", {
    employee_ids: employeeIds,
    flag,
    value,
  });
  return res.data;
};
