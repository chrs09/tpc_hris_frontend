import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format,
} from "date-fns";

export const useAttendanceWeek = () => {
  const today = new Date();

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const weekEndTemp = endOfWeek(today, { weekStartsOn: 1 });
  weekEndTemp.setDate(weekEndTemp.getDate() - 1); // Saturday
  const weekEnd = weekEndTemp;

  const isEditableDate = (date) => {
    return isWithinInterval(date, {
      start: weekStart,
      end: weekEnd,
    });
  };

  return {
    weekStart,
    weekEnd,
    isEditableDate,
    formattedRange: `${format(weekStart, "MMM dd")} - ${format(weekEnd, "MMM dd")}`,
  };
};