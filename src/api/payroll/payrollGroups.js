import api from "../services/api";

// Payroll Groups: departments paid by the same rule and cutoff, run as one
// payroll (backend app/api/payroll/payroll_groups.py).
export const getPayrollGroups = async () => {
  const res = await api.get("/payroll-groups");
  return res.data;
};

export const createPayrollGroup = async (group) => {
  const res = await api.post("/payroll-groups", group);
  return res.data;
};

export const updatePayrollGroup = async (id, group) => {
  const res = await api.patch(`/payroll-groups/${id}`, group);
  return res.data;
};

export const deletePayrollGroup = async (id) => {
  const res = await api.delete(`/payroll-groups/${id}`);
  return res.data;
};
