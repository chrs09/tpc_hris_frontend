import api from "../services/api";

// Employee/driver self-service
export const fileLeaveRequest = async ({ start_date, end_date, reason }) => {
  const res = await api.post("/leave/request", { start_date, end_date, reason });
  return res.data;
};

export const getMyLeaveRequests = async () => {
  const res = await api.get("/leave/my-requests");
  return res.data;
};

export const cancelLeaveRequest = async (leaveId) => {
  const res = await api.post(`/leave/${leaveId}/cancel`);
  return res.data;
};

// Admin/HR management
export const getAllLeaveRequests = async (status) => {
  const params = status ? `?status=${status}` : "";
  const res = await api.get(`/leave/list${params}`);
  return res.data;
};

export const approveLeaveRequest = async (leaveId, remarks) => {
  const res = await api.post(`/leave/${leaveId}/approve`, { remarks });
  return res.data;
};

export const rejectLeaveRequest = async (leaveId, remarks) => {
  const res = await api.post(`/leave/${leaveId}/reject`, { remarks });
  return res.data;
};
