import axios from "axios";
import { API_URL, getAuthHeader } from "../config";

//get attendance records for an employee
export const attendanceRecord = async () => {
  try {
    const res = await axios.get(`${API_URL}/attendance/list`, {
      headers: getAuthHeader(),
    });
    console.log("Attendance data fetched:", res.data);
    return res.data;
  } catch (err) {
    console.error(err.response?.data || err.message);
    return [];
  }
};

//attendance bulk checking api
export const bulkAttendanceCheck = async (records) => {
  try {
    const res = await axios.post(`${API_URL}/attendance/bulk-mixed/`, records, {
      headers: {
        ...getAuthHeader(),
      },
    });
    console.log("Bulk attendance check successful:", res.data);
    return res.data;
  } catch (err) {
    console.error(err.response?.data || err.message);
    return null;
  }
};

// update single attendance (PATCH)
export const updateAttendance = async (payload) => {
  try {
    const res = await axios.patch(`${API_URL}/attendance/update`, payload, {
      headers: {
        ...getAuthHeader(),
      },
    });

    console.log("Attendance updated:", res.data);
    return res.data;
  } catch (err) {
    console.error(err.response?.data || err.message);
    return null;
  }
};
