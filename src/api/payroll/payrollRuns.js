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

// Pay Runs: every run (any status), newest cutoff first.
export const listPayRuns = async () => {
  const res = await api.get("/payroll-runs/all");
  return res.data;
};

// New pay run (Draft) for a payroll group + cutoff ("start_end").
export const createPayRun = async (department, cutoffPeriod, payDate) => {
  const res = await api.post("/payroll-runs/create", {
    department,
    cutoff_period: cutoffPeriod,
    pay_date: payDate || null,
  });
  return res.data;
};

// The snapshot saved at Generate: { rows, period, group, taken_at } or null.
// Deductions step (at Generated): [{ employee_id, segment, sssLoan,
// cashAdvance, tripCharge, personalDeduction, personalDeductionNote }]
// -> { run, changed }. Cash advance / trip charges post to the balances.
export const savePayRunDeductions = async (department, cutoffPeriod, lines) => {
  const res = await api.post("/payroll-runs/deductions", {
    department,
    cutoff_period: cutoffPeriod,
    lines,
  });
  return res.data;
};

// Deductions checked -> Submit for Review becomes possible. Returns the run.
export const confirmPayRunDeductions = async (department, cutoffPeriod) => {
  const res = await api.post("/payroll-runs/deductions/confirm", {
    department,
    cutoff_period: cutoffPeriod,
  });
  return res.data;
};

// Contributions step: [{ employee_id, segment, sssDeduction,
// philhealthDeduction, pagibigDeduction, withholdingTax }] -> { run, changed }.
export const savePayRunContributions = async (department, cutoffPeriod, lines) => {
  const res = await api.post("/payroll-runs/contributions", {
    department,
    cutoff_period: cutoffPeriod,
    lines,
  });
  return res.data;
};

export const getPayRunSnapshot = async (department, cutoffPeriod) => {
  const res = await api.get("/payroll-runs/snapshot", {
    params: { department, cutoff_period: cutoffPeriod },
  });
  return res.data;
};

// Before generating: what's still open for these employees in start..end.
// { items: [{ key, label, count, entries: [{ name, date, detail }], fix }] }
// tripBasedIds: paid per trip -- left out of the missing time out and
// attendance review checks.
export const payRunPrecheck = async ({ start, end, employeeIds, tripBasedIds = [] }) => {
  const res = await api.post("/payroll-runs/precheck", {
    start,
    end,
    employee_ids: employeeIds,
    trip_based_ids: tripBasedIds,
  });
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

// Every trip each driver / helper did in start..end, any status, with
// whether payroll pays it yet ("counted").
export const getTripCheck = async (start, end) => {
  const res = await api.get("/payroll-runs/trip-check", { params: { start, end } });
  return res.data;
};

// Work History splits in start..end: { "<employee id>": [{ from, to,
// is_last, department, position, payroll_type, daily_rate, ... }] }.
export const getJobSegments = async (start, end) => {
  const res = await api.get("/payroll-runs/job-segments", { params: { start, end } });
  return res.data;
};

// Every Locked / Paid payroll (all groups), newest first, with how many
// payslips are released.
export const getLockedPayrolls = async () => {
  const res = await api.get("/payroll-runs/locked");
  return res.data;
};

// Released payslips of one payroll: { "<employee id>|<segment>":
// { released_at, released_by } }.
export const getPayslipReleases = async (department, cutoffPeriod) => {
  const res = await api.get("/payroll-runs/releases", {
    params: { department, cutoff_period: cutoffPeriod },
  });
  return res.data;
};

// Release one employee's payslip (payroll Locked / Paid). snapshot: the
// payslip as Payroll has it ({ row, period }).
export const releasePayslip = async (payload) => {
  const res = await api.post("/payroll-runs/release-payslip", payload);
  return res.data;
};

// The logged-in employee's released payslips (no snapshot), newest first.
export const getMyPayslips = async () => {
  const res = await api.get("/payroll-runs/my-payslips");
  return res.data;
};

// One of them with its snapshot ({ row, period }).
export const getMyPayslip = async (id) => {
  const res = await api.get(`/payroll-runs/my-payslips/${id}`);
  return res.data;
};
