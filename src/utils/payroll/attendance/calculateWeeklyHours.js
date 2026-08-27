import { calculateStandardAttendanceHours } from "./calculateStandardAttendanceHours";

// =====================================================
// WEEKLY / DAILY ATTENDANCE
// =====================================================

export function calculateWeeklyHours({
  checkIn,
  checkOut,
  schedule,
  attendanceDate,
}) {
  return calculateStandardAttendanceHours({
    checkIn,
    checkOut,
    schedule,
    attendanceDate,
  });
}
