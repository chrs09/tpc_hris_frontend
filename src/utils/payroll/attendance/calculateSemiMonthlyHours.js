import { calculateStandardAttendanceHours } from "./calculateStandardAttendanceHours";

// =====================================================
// SEMI-MONTHLY ATTENDANCE
// =====================================================

export function calculateSemiMonthlyHours({
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
