import api from "../services/api"; // your axios instance

// GET all unresolved reminders
export const getReminders = async () => {
  const response = await api.get("/reminders/");
  return response.data;
};

// CREATE reminder (superadmin only)
export const createReminder = async (message) => {
  const response = await api.post("/reminders/", {
    message,
  });
  return response.data;
};

// RESOLVE reminder
export const resolveReminder = async (id) => {
  const response = await api.patch(`/reminders/${id}`);
  return response.data;
};
