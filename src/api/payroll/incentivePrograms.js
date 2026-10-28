import api from "../services/api";

// Incentive Policies paid through payroll for the cutoff start..end:
// { "<employee id>": { total, lines: [{ program_id, name, rule_type, amount }] } }.
export const getPayrollIncentives = async (start, end) => {
  const res = await api.get("/incentive-programs/payroll", { params: { start, end } });
  return res.data;
};
