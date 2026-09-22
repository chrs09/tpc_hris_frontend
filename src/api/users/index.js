import api from "../services/api";

// Create user (superadmin only)
export const createUser = async (payload) => {
  const res = await api.post("/users/", payload);
  return res.data;
};

// Creates a login account (role=employee) for every active employee who
// doesn't already have one, in one shot -- see bulk_create_users_service
// on the backend. Returns { total_candidates, created: [...], failed: [...] }.
export const bulkCreateUsers = async () => {
  const res = await api.post("/users/bulk-create");
  return res.data;
};

// Get all users (if you build user list page later)
export const getUserList = async () => {
  const res = await api.get("/users/");
  return res.data;
};

// Minimal, lower-sensitivity user listing (id/username/role/active, no
// email) for populating an assignee picker -- open to any authenticated
// user, unlike getUserList() above which requires full Users access
// (administrator.users). Used by pages like Tickets/Hierarchy so someone
// granted only that page's own module can still populate its dropdown.
export const getAssignableUsers = async () => {
  const res = await api.get("/users/assignable");
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

// Resets a user's password to the lastname+birthday (MMDDYYYY) convention
// and returns it once, same as account creation.
export const resetUserPassword = async (userId) => {
  const res = await api.post(`/users/${userId}/reset-password`);
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
