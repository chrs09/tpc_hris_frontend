import api from "./services/api";

// Administrator -> Companies (superadmin only): the companies in the
// group -- for now, what a vehicle unit belongs to.
export const getCompanies = async () => {
  const res = await api.get("/companies");
  return res.data;
};

export const createCompany = async (payload) => {
  const res = await api.post("/companies", payload);
  return res.data;
};

export const updateCompany = async (id, payload) => {
  const res = await api.put(`/companies/${id}`, payload);
  return res.data;
};

export const deleteCompany = async (id) => {
  const res = await api.delete(`/companies/${id}`);
  return res.data;
};
