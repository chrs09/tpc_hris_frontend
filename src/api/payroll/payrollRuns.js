import api from "../services/api";

// Payroll status per department + cutoff:
// DRAFT -> GENERATED -> FOR_REVIEW -> APPROVED -> LOCKED -> PAID
// (backend: app/api/payroll/payroll_runs.py)

export const getPayrollRun = async (department, cutoffPeriod) => {
  const res = await api.get("/payroll-runs", {
    params: { department, cutoff_period: cutoffPeriod },
  });
  return res.data;
};

// { "2026-10-01_2026-10-15": "APPROVED", ... } for one department.
export const getPayrollRunStatuses = async (department) => {
  const res = await api.get("/payroll-runs/list", { params: { department } });
  return res.data;
};

export const markPayrollGenerated = async (payload) => {
  const res = await api.post("/payroll-runs/generate", payload);
  return res.data;
};

// action: submit | approve | return | lock | unlock | mark_paid
export const transitionPayrollRun = async (payload) => {
  const res = await api.post("/payroll-runs/transition", payload);
  return res.data;
};
