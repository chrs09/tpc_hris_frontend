import api from "../services/api";

export const getDepartmentHeads = async () => {
  const res = await api.get("/org-hierarchy/");
  return res.data;
};

export const setDepartmentHead = async (department, headUserId) => {
  const res = await api.put(`/org-hierarchy/${department}`, {
    head_user_id: headUserId,
  });
  return res.data;
};
