import { calculateWeeklyHours } from "./attendance/calculateWeeklyHours";

import { calculateSemiMonthlyHours } from "./attendance/calculateSemiMonthlyHours";

import { calculateMonthlyHours } from "./attendance/calculateMonthlyHours";

// =====================================================
// ATTENDANCE CALCULATOR DISPATCHER
// =====================================================

export function calculateAttendanceHours({
  checkIn,
  checkOut,
  schedule,
  attendanceDate,
  payrollType,
}) {
  // ===================================================
  // DAILY
  // ===================================================

  if (payrollType === "Daily") {
    return calculateWeeklyHours({
      checkIn,
      checkOut,
      schedule,
      attendanceDate,
    });
  }

  // ===================================================
  // WEEKLY
  // ===================================================

  if (payrollType === "Weekly") {
    return calculateWeeklyHours({
      checkIn,
      checkOut,
      schedule,
      attendanceDate,
    });
  }

  // ===================================================
  // SEMI-MONTHLY
  // ===================================================

  if (
    payrollType === "Semi-Monthly" ||
    payrollType === "Semi Monthly" ||
    payrollType === "SemiMonthly"
  ) {
    return calculateSemiMonthlyHours({
      checkIn,
      checkOut,
      schedule,
      attendanceDate,
    });
  }

  // ===================================================
  // MONTHLY
  // ===================================================

  if (payrollType === "Monthly") {
    return calculateMonthlyHours({
      checkIn,
      checkOut,
      schedule,
      attendanceDate,
    });
  }

  // ===================================================
  // UNKNOWN PAYROLL TYPE
  // ===================================================

  console.warn("Unknown payroll type:", payrollType);

  return {
    renderedHours: 0,
    regularHours: 0,
    overtimeHours: 0,

    tardinessMinutes: 0,
    tardinessHours: 0,

    undertimeMinutes: 0,
    undertimeHours: 0,

    firstHalfAbsent: false,
    secondHalfAbsent: false,

    scheduledTimeIn: "--",
    scheduledTimeOut: "--",
  };
}
