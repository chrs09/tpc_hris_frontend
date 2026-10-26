import api from "./services/api";

// Renameable page labels (superadmin) -- { name: title } for the ones
// changed; the page keeps its default for the rest.
export const getPageTitles = async (page) => {
  const res = await api.get(`/page-titles/${page}`);
  return res.data || {};
};

// A blank title goes back to the default.
export const savePageTitles = async (page, titles) => {
  const res = await api.put(`/page-titles/${page}`, titles);
  return res.data || {};
};
