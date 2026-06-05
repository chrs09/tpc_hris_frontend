import api from "../../api/services/api";

// single create attendance
export const markAttendance = async (payload) => {
  const res = await api.post("/attendance/", payload);
  return res.data;
};

// Get attendance records
export const attendanceRecord = async () => {
  const res = await api.get("/attendance/list?limit=5000");
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

export const approveAttendance = async (attendanceId) => {
  const res = await api.post(`/attendance/${attendanceId}/approve`);

  return res.data;
};

export const rejectAttendance = async (attendanceId) => {
  const res = await api.post(`/attendance/${attendanceId}/reject`);

  return res.data;
};

export const adjustAttendanceTime = async (
  attendanceId,
  payload,
) => {
  const res = await api.patch(
    `/attendance/${attendanceId}/adjust-time`,
    payload,
  );

  return res.data;
};

//Attendance Kiosk
// Kiosk Status
export const getKioskStatus = async (employeeId) => {
  const res = await api.get(
    `/attendance/kiosk/status/${employeeId}`,
  );

  return res.data;
};

// Kiosk Selfie Attendance
export const kioskSelfieAttendance = async (
  formData,
) => {
  const res = await api.post(
    "/attendance/kiosk/selfie",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};
