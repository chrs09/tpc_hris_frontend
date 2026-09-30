import api from "../services/api";

// Employee self-service. Only used now to find an overtime still open
// from the old clock-in flow (state "ongoing"), so it can be finished.
export const getOvertimeEligibility = async () => {
  const res = await api.get("/overtime-requests/eligibility");
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

// Every head-approved request, for Payroll to sum against its own cutoff
// periods and pre-fill its OT approval step (see PayrollList.jsx).
export const getApprovedOvertimeRequests = async () => {
  const res = await api.get("/overtime-requests/approved");
  return res.data;
};

// Approver self-service (requested-by user, or the requester's department
// head from the Reporting Hierarchy page)
export const getOvertimeRequestsForMyApproval = async () => {
  const res = await api.get("/overtime-requests/for-my-approval");
  return res.data;
};

export const approveOvertimeRequest = async (requestId, { approvedHours, remarks } = {}) => {
  const res = await api.post(`/overtime-requests/${requestId}/approve`, {
    approved_hours: approvedHours ?? null,
    remarks: remarks || null,
  });
  return res.data;
};

export const rejectOvertimeRequest = async (requestId, remarks) => {
  const res = await api.post(`/overtime-requests/${requestId}/reject`, {
    remarks: remarks || null,
  });
  return res.data;
};

// Overtime filing (no clock in/out): today -- before extending work or
// after -- or yesterday if it wasn't filed on the day. Options = those
// two days with pre-filled times.
export const getOvertimeFilingOptions = async () => {
  const res = await api.get("/overtime-requests/file/options");
  return res.data;
};

export const fileOvertime = async ({ otDate, timeIn, timeOut, reason, photo }) => {
  const formData = new FormData();
  formData.append("ot_date", otDate);
  formData.append("time_in", timeIn);
  formData.append("time_out", timeOut);
  formData.append("reason", reason);
  if (photo) formData.append("photo", photo);
  const res = await api.post("/overtime-requests/file", formData);
  return res.data;
};

// Overtime clocked in under the old flow and never clocked out: enter
// the real end time.
export const finishOvertime = async (requestId, { timeOut, note }) => {
  const formData = new FormData();
  formData.append("time_out", timeOut);
  formData.append("note", note);
  const res = await api.post(`/overtime-requests/${requestId}/finish`, formData);
  return res.data;
};
