import api from "./services/api";

// HRIS -> Attendance Locations (backend: app/api/attendance_locations.py):
// where employees may time in/out, the perimeter, each employee's assigned
// locations and the minimum hours of duty.

export const getAttendanceLocations = async () =>
  (await api.get("/attendance-locations")).data;

export const createAttendanceLocation = async (payload) =>
  (await api.post("/attendance-locations", payload)).data;

export const updateAttendanceLocation = async (id, payload) =>
  (await api.patch(`/attendance-locations/${id}`, payload)).data;

export const getAttendanceSettings = async () =>
  (await api.get("/attendance-locations/settings")).data;

export const saveAttendanceSettings = async (minDutyMinutes) =>
  (await api.put("/attendance-locations/settings", { min_duty_minutes: minDutyMinutes })).data;

export const getEmployeeAttendanceRules = async () =>
  (await api.get("/attendance-locations/employees")).data;

// minDutyMinutes null = the company default.
export const saveEmployeeAttendanceRules = async (employeeId, locationIds, minDutyMinutes) =>
  (
    await api.put(`/attendance-locations/employees/${employeeId}`, {
      location_ids: locationIds,
      min_duty_minutes: minDutyMinutes,
    })
  ).data;
