import api from "../../api/services/api";

// single create attendance
export const markAttendance = async (payload) => {
  const res = await api.post("/attendance/", payload);
  return res.data;
};

// Get attendance records
export const attendanceRecord = async ({
  department = "All",
  limit = 5000,
  attendance_date,
  // Callers that don't render photos (e.g. PayrollList - it only needs
  // hours/status/trip data) can pass false to skip the profile/time-in/
  // time-out photo lookups and URL fields on the backend entirely.
  includePhotos = true,
  // "all" = everyone (Payroll); otherwise an org chart head gets only
  // their team.
  scope,
} = {}) => {
  const params = new URLSearchParams();

  if (scope) {
    params.append("scope", scope);
  }

  params.append("limit", limit);

  if (department && department !== "All") {
    params.append("department", department);
  }

  if (attendance_date) {
    params.append("attendance_date", attendance_date);
  }

  if (!includePhotos) {
    params.append("include_photos", "false");
  }

  const res = await api.get(`/attendance/list?${params.toString()}`);

  // New backend response
  if (res.data && !Array.isArray(res.data) && Array.isArray(res.data.records)) {
    const records = res.data.records;

    const activeEmployeeCount = res.data.active_employee_count || 0;

    console.log(
      "Total Active Employees (Admin + motorpool):",
      activeEmployeeCount,
    );

    records.active_employee_count = activeEmployeeCount;
    // Org chart head: the employee ids (and unit names) they're limited to.
    records.team_employee_ids = res.data.team_employee_ids ?? null;
    records.team_units = res.data.team_units ?? null;

    return records;
  }

  // Backward compatibility if backend still returns an array
  if (Array.isArray(res.data)) {
    console.log("Total Active Employees (Admin + motorpool):", 0);

    res.data.active_employee_count = 0;

    return res.data;
  }

  console.log("Total Active Employees (Admin + motorpool):", 0);

  return [];
};

// Attendance history for the logged-in user's own employee record
export const getMyAttendanceHistory = async (month) => {
  const params = month ? `?month=${month}` : "";
  const res = await api.get(`/attendance/my-history${params}`);
  return res.data;
};

// Bulk attendance check
export const bulkAttendanceCheck = async (records) => {
  const res = await api.post("/attendance/bulk-mixed/", records);
  return res.data;
};

// Update single attendance
export const updateAttendance = async (payload) => {
  const res = await api.patch("/attendance/update", payload);
  return res.data;
};

export const timeInSelfie = async (formData) => {
  const res = await api.post("/attendance/time-in-selfie", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// `side` is "time_in" (default) or "time_out" -- face review now runs
// independently for both, so approving/rejecting one never touches the
// other's status.
// remarks: required by the server when passing it up to the next head.
// timeOut: missed time out only -- the approver's corrected "HH:MM".
export const approveAttendance = async (attendanceId, side = "time_in", remarks, timeOut) => {
  const res = await api.post(`/attendance/${attendanceId}/approve?side=${side}`, {
    remarks: remarks || null,
    ...(timeOut ? { time_out: timeOut } : {}),
  });

  return res.data;
};

export const rejectAttendance = async (attendanceId, side = "time_in", remarks) => {
  const res = await api.post(
    `/attendance/${attendanceId}/reject?side=${side}`,
    { remarks: remarks || null },
  );

  return res.data;
};

// Turn a sideways selfie upright (90° clockwise per call). Saved as a new
// photo -- the original is kept -- and the face match is re-run.
export const rotateAttendancePhoto = async (attendanceId, side = "time_in", degrees = 90) => {
  const res = await api.post(
    `/attendance/${attendanceId}/rotate-photo?side=${side}`,
    { degrees },
  );

  return res.data;
};

export const adjustAttendanceTime = async (attendanceId, payload) => {
  const res = await api.patch(
    `/attendance/${attendanceId}/adjust-time`,
    payload,
  );

  return res.data;
};

// Changing a time that was already recorded needs a reason (it's kept in
// the attendance change log). Tries without one first -- setting a time
// for the first time doesn't need it -- and asks only if the server does.
// `askReason` returns the reason, or null if cancelled.
export const adjustAttendanceTimeWithReason = async (
  attendanceId,
  payload,
  askReason,
) => {
  try {
    return await adjustAttendanceTime(attendanceId, payload);
  } catch (error) {
    const detail = error.response?.data?.detail;
    if (error.response?.status !== 400 || !String(detail).includes("reason")) {
      throw error;
    }
    const reason = await askReason();
    if (reason === null || !reason.trim()) {
      const cancelled = new Error("A reason is needed to change the recorded time.");
      cancelled.cancelled = true;
      throw cancelled;
    }
    return adjustAttendanceTime(attendanceId, { ...payload, reason: reason.trim() });
  }
};

//Attendance Kiosk
// Kiosk Status
export const getKioskStatus = async (employeeId) => {
  const res = await api.get(`/attendance/kiosk/status/${employeeId}`);

  return res.data;
};

// Forgot to time out: file the earlier day's time out ("HH:MM", PH) +
// reason before timing in again -- goes to the Org Chart attendance
// approvers.
export const fileKioskMissedTimeOut = async (employeeId, attendanceId, timeOut, reason) => {
  const res = await api.post("/attendance/kiosk/missed-time-out", {
    employee_id: Number(employeeId),
    attendance_id: attendanceId,
    time_out: timeOut,
    reason,
  });
  return res.data;
};

// A head sets a missed time out themselves (before it's filed).
export const setMissedTimeOut = async (attendanceId, timeOut, remarks) => {
  const res = await api.post(`/attendance/${attendanceId}/set-missed-time-out`, {
    time_out: timeOut,
    remarks: remarks || null,
  });
  return res.data;
};

// Kiosk Selfie Attendance
export const kioskSelfieAttendance = async (formData) => {
  const res = await api.post("/attendance/kiosk/selfie", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// Bell: time in/out outside the allowed area still waiting for review
// (superadmin, or Attendance grid view with "Can edit: Yes").
export const getGeofenceAlerts = async () => {
  const res = await api.get("/attendance/geofence-alerts");
  return res.data;
};

// Org chart heads: attendance (time in/out needing review) whose turn is
// with me.
export const getAttendanceForMyApproval = async () => {
  const res = await api.get("/attendance/for-my-approval");
  return res.data;
};
