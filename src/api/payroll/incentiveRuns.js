import api from "../services/api";

// Incentive Runs: incentives paid out apart from payroll, with their own
// approval and history (app/api/payroll/incentive_runs.py).

export const getIncentiveRuns = async (params = {}) => {
  const res = await api.get("/incentive-runs", { params });
  return res.data;
};

export const getIncentiveRun = async (id) => {
  const res = await api.get(`/incentive-runs/${id}`);
  return res.data;
};

// { name, period_start, period_end, program_ids, release_method,
//   payroll_date, notes }
export const createIncentiveRun = async (payload) => {
  const res = await api.post("/incentive-runs", payload);
  return res.data;
};

export const updateIncentiveRun = async (id, payload) => {
  const res = await api.put(`/incentive-runs/${id}`, payload);
  return res.data;
};

export const generateIncentiveRun = async (id) => {
  const res = await api.post(`/incentive-runs/${id}/generate`);
  return res.data;
};

export const addIncentiveAdjustment = async (id, { employeeId, amount, note }) => {
  const res = await api.post(`/incentive-runs/${id}/adjustments`, {
    employee_id: employeeId,
    amount,
    note,
  });
  return res.data;
};

export const deleteIncentiveAdjustment = async (id, lineId) => {
  const res = await api.delete(`/incentive-runs/${id}/adjustments/${lineId}`);
  return res.data;
};

// action: submit | approve | return | release | cancel
export const transitionIncentiveRun = async (id, { action, note, reference, releasedOn }) => {
  const res = await api.post(`/incentive-runs/${id}/transition`, {
    action,
    note: note || null,
    reference: reference || null,
    released_on: releasedOn || null,
  });
  return res.data;
};

// Lines of approved / released runs. status: paid | released | approved | all.
export const getIncentiveHistory = async ({ dateFrom, dateTo, status, programId } = {}) => {
  const res = await api.get("/incentive-runs/history", {
    params: {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: status || undefined,
      program_id: programId || undefined,
    },
  });
  return res.data;
};

// Approved / released "with payroll" runs on the cutoff, by employee id:
// { "<id>": { total, lines: [{ run_id, run_name, program_name, amount, status }] } }.
export const getIncentivesForPayroll = async (start, end) => {
  const res = await api.get("/incentive-runs/payroll", { params: { start, end } });
  return res.data;
};
