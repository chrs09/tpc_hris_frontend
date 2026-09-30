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

// Late filing (forgot to clock in/out) -- only days in the current
// payroll cutoff. Options = those days with pre-filled times.
export const getMissedOvertimeOptions = async () => {
  const res = await api.get("/overtime-requests/missed/options");
  return res.data;
};

export const fileMissedOvertime = async ({ otDate, timeIn, timeOut, reason, photo }) => {
  const formData = new FormData();
  formData.append("ot_date", otDate);
  formData.append("time_in", timeIn);
  formData.append("time_out", timeOut);
  formData.append("reason", reason);
  if (photo) formData.append("photo", photo);
  const res = await api.post("/overtime-requests/missed", formData);
  return res.data;
};

// Clocked in but forgot to clock out: enter the real end time.
export const finishOvertime = async (requestId, { timeOut, note }) => {
  const formData = new FormData();
  formData.append("time_out", timeOut);
  formData.append("note", note);
  const res = await api.post(`/overtime-requests/${requestId}/finish`, formData);
  return res.data;
};
