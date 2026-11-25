import api from "../services/api";

// System Logs (superadmin only): every change request -- who sent it, the
// URL, what was sent and the rows it changed (old -> new).
export const getSystemLogs = async ({
  limit = 50,
  offset = 0,
  search,
  username,
  method,
  outcome,
  changedOnly,
  dateFrom,
  dateTo,
} = {}) => {
  const params = new URLSearchParams();
  params.append("limit", limit);
  params.append("offset", offset);
  if (search && search.trim()) params.append("search", search.trim());
  if (username && username.trim()) params.append("username", username.trim());
  if (method) params.append("method", method);
  if (outcome) params.append("outcome", outcome);
  if (changedOnly) params.append("changed_only", "true");
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  const res = await api.get(`/system-logs?${params.toString()}`);
  return res.data;
};
