import api from "../services/api";

export const getDepartmentHeads = async () => {
  const res = await api.get("/org-hierarchy/");
  return res.data;
};

// Whether the logged-in user is themselves set as an immediate head for
// any department -- used to decide whether to show the OT Approvals nav
// item (see useModuleAccess.js).
export const getAmIDepartmentHead = async () => {
  const res = await api.get("/org-hierarchy/am-i-head");
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

// Org chart tree (Administrator -> Org Chart): units with their head,
// member rules and resolved members, plus choices for the rule pickers.
export const getOrgChart = async () => {
  const res = await api.get("/org-chart");
  return res.data;
};

// Superadmin only.
export const createOrgUnit = async (name, parentId) => {
  const res = await api.post("/org-chart/units", {
    name,
    parent_id: parentId ?? null,
  });
  return res.data;
};

// changes: { name, parent_id (-1 = top level), head_user_id (0 = none),
//   positions, roles, departments, employee_ids }
export const updateOrgUnit = async (unitId, changes) => {
  const res = await api.put(`/org-chart/units/${unitId}`, changes);
  return res.data;
};

export const deleteOrgUnit = async (unitId) => {
  const res = await api.delete(`/org-chart/units/${unitId}`);
  return res.data;
};

// What the logged-in user approves as an Org Chart head
// ({ cash_advance, overtime, attendance } booleans) -- shows the matching
// approval pages in the menu (see useModuleAccess.js).
export const getMyApprovalKinds = async () => {
  const res = await api.get("/org-chart/my-approvals");
  return res.data;
};
