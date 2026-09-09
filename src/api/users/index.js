import api from "../services/api";

// Create user (superadmin only)
export const createUser = async (payload) => {
  const res = await api.post("/users/", payload);
  return res.data;
};

// Get all users (if you build user list page later)
export const getUserList = async () => {
  const res = await api.get("/users/");
  return res.data;
};

export const updateUser = async (userId, payload) => {
  const res = await api.patch(`/users/${userId}`, payload);
  return res.data;
};

// Audit trail of role/active-status changes for a user (superadmin only).
export const getUserRevisions = async (userId) => {
  const res = await api.get(`/users/${userId}/revisions`);
  return res.data;
};

// Deactivate user (future feature)
export const deactivateUser = async (userId) => {
  const res = await api.patch(`/users/${userId}/deactivate`);
  return res.data;
};

// Issues a short-lived token for another user's account so superadmin
// can see exactly what they see (Sidebar, module access, dashboards).
export const impersonateUser = async (userId) => {
  const res = await api.post(`/users/${userId}/impersonate`);
  return res.data;
};
