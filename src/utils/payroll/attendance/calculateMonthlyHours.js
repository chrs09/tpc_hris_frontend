import { calculateStandardAttendanceHours } from "./calculateStandardAttendanceHours";

// =====================================================
// MONTHLY ATTENDANCE
// =====================================================

export function calculateMonthlyHours({
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
