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

// Cash Advance Immediate Head -- a separate per-department assignment
// from the general immediate head above, used only to resolve who
// approves cash advance requests (see file_cash_advance_request in
// app/api/cash_advance_request.py). Falls back to a superadmin when a
// department hasn't set one yet, rather than blocking the request.
export const getCashAdvanceHeads = async () => {
  const res = await api.get("/org-hierarchy/cash-advance-heads");
  return res.data;
};

export const setCashAdvanceHead = async (department, headUserId) => {
  const res = await api.put(`/org-hierarchy/cash-advance-heads/${department}`, {
    head_user_id: headUserId,
  });
  return res.data;
};
