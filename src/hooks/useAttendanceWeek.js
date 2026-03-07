import {
  startOfWeek,
  endOfWeek,
  format,
  isAfter,
  startOfDay,
  getDay,
} from "date-fns";

export const useAttendanceWeek = (isSuperAdmin) => {
  const today = startOfDay(new Date());

  // (Optional) Still compute week range for display
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const weekEndTemp = endOfWeek(today, { weekStartsOn: 1 });
  weekEndTemp.setDate(weekEndTemp.getDate() - 1); // Saturday
  const weekEnd = startOfDay(weekEndTemp);

  const isEditableDate = (date) => {
    const cleanDate = startOfDay(date);

    // 🚫 Block future dates
    if (isAfter(cleanDate, today)) return false;

    // 🚫 Block Sunday (0 = Sunday)
    if (getDay(cleanDate) === 0) return false;

    // 🚫 Only superadmin can edit
    if (!isSuperAdmin) return false;

    // ✅ Allow past + today
    return true;
  };

  return {
    weekStart,
    weekEnd,
    isEditableDate,
    formattedRange: `${format(weekStart, "MMM dd")} - ${format(
      weekEnd,
      "MMM dd",
    )}`,
  };
};
