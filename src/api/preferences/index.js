import api from "../services/api";

// The logged-in user's own theme ({ mode, accent }), saved on their
// account so it follows them on every device.
export const getMyTheme = async () => {
  const res = await api.get("/me/theme");
  return res.data;
};

export const saveMyTheme = async ({ mode, accent }) => {
  const res = await api.put("/me/theme", { mode, accent });
  return res.data;
};
