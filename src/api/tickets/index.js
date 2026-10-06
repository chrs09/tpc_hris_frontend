import api from "../services/api";

// Helpdesk tickets: each has a category, and the category's Org Chart
// unit handles it unless the creator picks someone
// (backend: app/api/tickets.py).

// { tickets, sees_all }
export const getTickets = async () => {
  const res = await api.get("/tickets");
  return res.data;
};

export const createTicket = async ({
  title,
  description,
  priority,
  category_id,
  assigned_to_user_id,
}) => {
  const res = await api.post("/tickets", {
    title,
    description,
    priority,
    category_id,
    assigned_to_user_id,
  });
  return res.data;
};

// Hand a ticket to another category/team and/or person, with a note.
export const forwardTicket = async (ticketId, { category_id, assigned_to_user_id, note }) => {
  const res = await api.post(`/tickets/${ticketId}/forward`, {
    category_id,
    assigned_to_user_id,
    note,
  });
  return res.data;
};

// { categories, teams, can_manage }
export const getTicketCategories = async (includeInactive = false) => {
  const res = await api.get("/tickets/categories", {
    params: includeInactive ? { include_inactive: true } : {},
  });
  return res.data;
};

export const saveTicketCategory = async (category) => {
  const res = category.id
    ? await api.put(`/tickets/categories/${category.id}`, category)
    : await api.post("/tickets/categories", category);
  return res.data;
};

// Anyone active can be assigned a ticket.
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

// toCustomer: public tickets -- also email the reply to the customer.
export const addTicketComment = async (ticketId, body, toCustomer = false) => {
  const res = await api.post(`/tickets/${ticketId}/comments`, {
    body,
    to_customer: toCustomer,
  });
  return res.data;
};

// Only the comment's author can delete it.
export const deleteTicketComment = async (ticketId, commentId) => {
  const res = await api.delete(`/tickets/${ticketId}/comments/${commentId}`);
  return res.data;
};
