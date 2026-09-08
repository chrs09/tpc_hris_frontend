import api from "../services/api";

// Employee self-service
export const getOvertimeApprovers = async () => {
  const res = await api.get("/overtime-requests/approvers");
  return res.data;
};

export const fileOvertimeRequest = async ({
  requested_by_user_id,
  ot_date,
  time_in,
  time_out,
  reason,
}) => {
  const res = await api.post("/overtime-requests/", {
    requested_by_user_id,
    ot_date,
    time_in,
    time_out,
    reason,
  });
  return res.data;
};

export const getMyOvertimeRequests = async () => {
  const res = await api.get("/overtime-requests/mine");
  return res.data;
};

export const cancelOvertimeRequest = async (requestId) => {
  const res = await api.post(`/overtime-requests/${requestId}/cancel`);
  return res.data;
};
