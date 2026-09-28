import api from "../services/api";

// Same events posted to Slack's #production-errors (see
// send_error_alert/send_response_alert on the backend) -- browsable here
// so a superadmin doesn't have to scroll Slack history.
export const getErrorLogs = async ({
  limit = 50,
  offset = 0,
  statusCode,
  search,
} = {}) => {
  const params = new URLSearchParams();
  params.append("limit", limit);
  params.append("offset", offset);
  if (statusCode) params.append("status_code", statusCode);
  if (search && search.trim()) params.append("search", search.trim());

  const res = await api.get(`/error-logs?${params.toString()}`);
  return res.data;
};
