import api from "./services/api";

// Schedule changes: a different time in / out for one date, approved by
// the Org Chart heads (backend app/api/schedule_changes.py).

// { can_file, reason } -- the employee is allowed (201) and times in / out.
export const getScheduleChangeEligibility = async () =>
  (await api.get("/schedule-changes/eligibility")).data;

// { schedule_date: "YYYY-MM-DD", time_in: "HH:MM", time_out: "HH:MM", reason }
export const fileScheduleChange = async (payload) =>
  (await api.post("/schedule-changes", payload)).data;

export const getMyScheduleChanges = async () => (await api.get("/schedule-changes/mine")).data;

export const cancelScheduleChange = async (id) =>
  (await api.post(`/schedule-changes/${id}/cancel`)).data;

export const getScheduleChangesForMe = async () =>
  (await api.get("/schedule-changes/for-my-approval")).data;

export const approveScheduleChange = async (id, remarks) =>
  (await api.post(`/schedule-changes/${id}/approve`, { remarks: remarks || null })).data;

export const rejectScheduleChange = async (id, remarks) =>
  (await api.post(`/schedule-changes/${id}/reject`, { remarks: remarks || null })).data;

// Approved ones in start..end: { "<employee id>": { "YYYY-MM-DD": { time_in, time_out } } }.
export const getApprovedScheduleChanges = async (start, end) =>
  (await api.get("/schedule-changes/approved", { params: { start, end } })).data;
