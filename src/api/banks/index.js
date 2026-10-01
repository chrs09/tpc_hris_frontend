import api from "../services/api";

// Banks for the employee 201 form (Bank Type), managed on Finance ->
// Bank Master. No delete -- a bank no longer offered is hidden.
export const getBanks = async ({ includeHidden = false } = {}) => {
  const res = await api.get("/banks", {
    params: includeHidden ? { include_hidden: true } : undefined,
  });
  return res.data;
};

export const addBank = async (name) => {
  const res = await api.post("/banks", { name });
  return res.data;
};

export const updateBank = async (bankId, changes) => {
  const res = await api.patch(`/banks/${bankId}`, changes);
  return res.data;
};
