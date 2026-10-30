import api from "../services/api";

// Incentive Policies programs (app/api/payroll/incentive_programs.py).

// Newest period first; `year` / `month` / `rule_type` filter.
export const getIncentivePrograms = async (params = {}) => {
  const res = await api.get("/incentive-programs", { params });
  return res.data;
};

// Each rule type's label, default settings and default release method.
export const getIncentiveRuleTypes = async () => {
  const res = await api.get("/incentive-programs/rule-types");
  return res.data;
};

// Hubs (start points) for the long-distance route list: [{ id, name }].
export const getIncentiveHubs = async () => {
  const res = await api.get("/incentive-programs/hubs");
  return res.data;
};

// { name, memo_no, rule_type, applies_to: ["drivers", "helpers"],
//   period_start, period_end, release_date, settings, is_active, notes }
export const createIncentiveProgram = async (payload) => {
  const res = await api.post("/incentive-programs", payload);
  return res.data;
};

export const updateIncentiveProgram = async (id, payload) => {
  const res = await api.put(`/incentive-programs/${id}`, payload);
  return res.data;
};

// Same rule and amounts for a new period: { period_start, period_end,
// release_date, memo_no }.
export const copyIncentiveProgram = async (id, payload) => {
  const res = await api.post(`/incentive-programs/${id}/copy`, payload);
  return res.data;
};

export const deleteIncentiveProgram = async (id) => {
  const res = await api.delete(`/incentive-programs/${id}`);
  return res.data;
};

// What everyone earns under the program so far (nothing is saved).
export const getIncentiveProgramResults = async (id) => {
  const res = await api.get(`/incentive-programs/${id}/results`);
  return res.data;
};
