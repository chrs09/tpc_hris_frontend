import api from "../services/api";

// Incentive Policies programs (newest period first); `year` / `month`
// keep the ones running then.
export const getIncentivePrograms = async (params = {}) => {
  const res = await api.get("/incentive-programs", { params });
  return res.data;
};

// Each rule type's label, default settings and default release method.
export const getIncentiveRuleTypes = async () => {
  const res = await api.get("/incentive-programs/rule-types");
  return res.data;
};
