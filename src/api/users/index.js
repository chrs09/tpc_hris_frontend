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

// Deactivate user (future feature)
export const deactivateUser = async (userId) => {
  const res = await api.patch(`/users/${userId}/deactivate`);
  return res.data;
};
