import api from "../../api/services/api";
import { getAuthHeader } from "../config";

// Get attendance records
export const attendanceRecord = async () => {
  const res = await api.get("/attendance/list", {
    headers: getAuthHeader(),
  });

  console.log("Attendance data fetched:", res.data);
  return res.data;
};

// Bulk attendance check
export const bulkAttendanceCheck = async (records) => {
  const res = await api.post("/attendance/bulk-mixed/", records, {
    headers: getAuthHeader(),
  });

  console.log("Bulk attendance check successful:", res.data);
  return res.data;
};

// Update single attendance
export const updateAttendance = async (payload) => {
  const res = await api.patch("/attendance/update", payload, {
    headers: getAuthHeader(),
  });

  console.log("Attendance updated:", res.data);
  return res.data;
};
