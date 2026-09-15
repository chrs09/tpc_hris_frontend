import api from "../services/api";

// Superadmin's Kanban-style change-request board.

export const getTickets = async () => {
  const res = await api.get("/tickets");
  return res.data;
};

export const createTicket = async ({
  title,
  description,
  priority,
  assignedToUserId,
}) => {
  const res = await api.post("/tickets", {
    title,
    description,
    priority,
    assigned_to_user_id: assignedToUserId,
  });
  return res.data;
};

export const updateTicket = async (ticketId, changes) => {
  const res = await api.patch(`/tickets/${ticketId}`, changes);
  return res.data;
};

export const deleteTicket = async (ticketId) => {
  const res = await api.delete(`/tickets/${ticketId}`);
  return res.data;
};
