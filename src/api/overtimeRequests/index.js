import api from "../services/api";

// Employee self-service -- action-based clock-in/out flow.
// Tells the dashboard whether to show "Overtime In" (not yet eligible /
// eligible) or "Overtime Out" (already clocked in to an ongoing request).
export const getOvertimeEligibility = async () => {
  const res = await api.get("/overtime-requests/eligibility");
  return res.data;
};

// Clocks in to overtime. Requires a live selfie photo (File/Blob) and a
// reason. Location (if available/granted) is only used to stamp a
// geofence label onto the selfie's watermark for a visual record -- it's
// never required or enforced the way trip GPS is. The approver is
// resolved server-side from the employee's department head.
export const clockInOvertime = async ({ photo, reason, lat, long }) => {
  const formData = new FormData();
  formData.append("photo", photo);
  formData.append("reason", reason);
  if (lat != null && long != null) {
    formData.append("lat", lat);
    formData.append("long", long);
  }
  const res = await api.post("/overtime-requests/clock-in", formData);
  return res.data;
};

export const clockOutOvertime = async (requestId, { lat, long } = {}) => {
  let body;
  if (lat != null && long != null) {
    body = new FormData();
    body.append("lat", lat);
    body.append("long", long);
  }
  const res = await api.post(
    `/overtime-requests/${requestId}/clock-out`,
    body,
  );
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
