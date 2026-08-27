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
} = {}) => {
  const params = new URLSearchParams();

  params.append("limit", limit);

  if (department && department !== "All") {
    params.append("department", department);
  }

  if (attendance_date) {
    params.append("attendance_date", attendance_date);
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

export const adjustAttendanceTime = async (attendanceId, payload) => {
  const res = await api.patch(
    `/attendance/${attendanceId}/adjust-time`,
    payload,
  );

  return res.data;
};

//Attendance Kiosk
// Kiosk Status
export const getKioskStatus = async (employeeId) => {
  const res = await api.get(`/attendance/kiosk/status/${employeeId}`);

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
