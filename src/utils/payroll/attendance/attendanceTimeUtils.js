// =====================================================
// ATTENDANCE TIME UTILITIES
// =====================================================

export const LUNCH_BREAK_START_MINUTES = 12 * 60; // 12:00 PM
export const LUNCH_BREAK_END_MINUTES = 13 * 60; // 1:00 PM

export const MORNING_SHIFT_START_MINUTES = 8 * 60; // 8:00 AM
export const MORNING_SHIFT_END_MINUTES = 12 * 60; // 12:00 PM

export const AFTERNOON_SHIFT_START_MINUTES = 13 * 60; // 1:00 PM
export const AFTERNOON_SHIFT_END_MINUTES = 17 * 60; // 5:00 PM

export const TIMEZONE_OFFSET_MINUTES = 8 * 60;

// =====================================================
// UTC RAW CLOCK → ASIA/MANILA CLOCK
// =====================================================

export function toLocalMinutes(rawMinutes) {
  return (((rawMinutes + TIMEZONE_OFFSET_MINUTES) % 1440) + 1440) % 1440;
}

// =====================================================
// FORMAT HH:MM
// =====================================================

export function formatLocalTimeFromMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// =====================================================
// LUNCH CHECK
// =====================================================

export function crossesLunchBreak(startMinutes, endMinutes) {
  if (endMinutes <= startMinutes) {
    return false;
  }

  return (
    startMinutes <= LUNCH_BREAK_START_MINUTES &&
    endMinutes >= LUNCH_BREAK_END_MINUTES
  );
}

// =====================================================
// HALF-DAY CHECKS
// =====================================================

export function isFirstHalfAbsent(actualInMinutes) {
  return (
    actualInMinutes >= LUNCH_BREAK_START_MINUTES &&
    actualInMinutes < LUNCH_BREAK_END_MINUTES
  );
}

export function isSecondHalfAbsent(actualOutMinutes) {
  return actualOutMinutes > 0 && actualOutMinutes <= MORNING_SHIFT_END_MINUTES;
}
