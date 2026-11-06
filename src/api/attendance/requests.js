import api from "../services/api";

// Missed time in (heads answer) and time corrections (employees file) --
// tpc_hris_backend/app/api/attendance_requests.py.

// Heads: employees not timed in (today) / with a missing day this cutoff.
export const getMissedTimeInForMe = async () =>
  (await api.get("/attendance-requests/missed-time-in")).data;

// decision: today late | second_half | absent; an earlier day works | absent.
export const decideMissedTimeIn = async (id, decision, reason) =>
  (await api.post(`/attendance-requests/missed-time-in/${id}/decide`, { decision, reason })).data;

// Employee: days their head said they worked, still without a time in.
export const getMyMissedDays = async () =>
  (await api.get("/attendance-requests/my-alerts")).data;

export const getMyTimeCorrections = async () =>
  (await api.get("/attendance-requests/time-corrections/mine")).data;

// { attendance_date: "YYYY-MM-DD", time_in?: "HH:MM", time_out?: "HH:MM", reason }
export const fileTimeCorrection = async (payload) =>
  (await api.post("/attendance-requests/time-corrections", payload)).data;

export const cancelTimeCorrection = async (id) =>
  (await api.post(`/attendance-requests/time-corrections/${id}/cancel`)).data;

export const getTimeCorrectionsForMe = async () =>
  (await api.get("/attendance-requests/time-corrections/for-my-approval")).data;

// The approver may fix the times ("HH:MM") before approving.
export const approveTimeCorrection = async (id, { remarks, time_in, time_out } = {}) =>
  (
    await api.post(`/attendance-requests/time-corrections/${id}/approve`, {
      remarks,
      time_in,
      time_out,
    })
  ).data;

export const rejectTimeCorrection = async (id, remarks) =>
  (await api.post(`/attendance-requests/time-corrections/${id}/reject`, { remarks })).data;

// { can_file, reason } -- anyone who times in / out (any role), but not
// drivers / helpers (attendance from trips) or logins without an employee.
export const getTimeCorrectionEligibility = async () =>
  (await api.get("/attendance-requests/time-corrections/eligibility")).data;
