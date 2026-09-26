import api from "../services/api";

// Superadmin's Kanban-style change-request board.

export const getTickets = async () => {
  const res = await api.get("/tickets");
  return res.data;
};

// Tickets are assigned to IT automatically (never the creator).
export const createTicket = async ({ title, description, priority }) => {
  const res = await api.post("/tickets", { title, description, priority });
  return res.data;
};

// The IT employees a ticket can be (re)assigned to.
export const getTicketAssignees = async () => {
  const res = await api.get("/tickets/assignees");
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

export const uploadTicketImage = async (ticketId, file) => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post(`/tickets/${ticketId}/image`, formData);
  return res.data;
};

export const removeTicketImage = async (ticketId) => {
  const res = await api.delete(`/tickets/${ticketId}/image`);
  return res.data;
};

// Comments/remarks on a ticket, oldest first.
export const getTicketComments = async (ticketId) => {
  const res = await api.get(`/tickets/${ticketId}/comments`);
  return res.data;
};

export const addTicketComment = async (ticketId, body) => {
  const res = await api.post(`/tickets/${ticketId}/comments`, { body });
  return res.data;
};

// Only the comment's author can delete it.
export const deleteTicketComment = async (ticketId, commentId) => {
  const res = await api.delete(`/tickets/${ticketId}/comments/${commentId}`);
  return res.data;
};
