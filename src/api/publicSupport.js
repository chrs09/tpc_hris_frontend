import api from "./services/api";

// Public customer support (no login): /api/public/support on the
// backend (app/api/public/support.py).
const base = "/public/support";

export const getPublicSupportCategories = async () => {
  const res = await api.get(`${base}/categories`);
  return res.data;
};

export const submitPublicTicket = async (formData) => {
  const res = await api.post(`${base}/tickets`, formData);
  return res.data;
};

export const checkPublicTicket = async (ticketNo, contact) => {
  const res = await api.get(`${base}/tickets/${encodeURIComponent(ticketNo)}`, {
    params: { contact },
  });
  return res.data;
};
