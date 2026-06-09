import { format, endOfMonth } from "date-fns";

export const getPayrollPeriods = (department, count = 12) => {
  const periods = [];

  const today = new Date();

  /**
   * =====================================
   * MOTORPOOL
   * THURSDAY -> WEDNESDAY
   * PAYOUT SATURDAY
   * =====================================
   */
  if (department === "Motorpool") {
    const current = new Date(today);

    while (current.getDay() !== 4) {
      current.setDate(current.getDate() - 1);
    }

    for (let i = 0; i < count; i++) {
      const start = new Date(current);

      const end = new Date(current);
      end.setDate(end.getDate() + 6);

      const payout = new Date(end);
      payout.setDate(payout.getDate() + 3);

      periods.push({
        label: `${format(start, "MMM dd, yyyy")} - ${format(
          end,
          "MMM dd, yyyy",
        )}`,
        cutoffStart: format(start, "yyyy-MM-dd"),
        cutoffEnd: format(end, "yyyy-MM-dd"),
        payoutDate: format(payout, "yyyy-MM-dd"),
        payrollType: "Weekly",
      });

      current.setDate(current.getDate() - 7);
    }

    return periods;
  }

  /**
   * =====================================
   * ADMIN
   * =====================================
   */
  if (department === "Admin") {
    let current = new Date(today);

    for (let i = 0; i < count; i++) {
      const year = current.getFullYear();

      const month = current.getMonth();

      periods.push({
        label: `${format(new Date(year, month, 11), "MMM dd")} - ${format(
          new Date(year, month, 25),
          "MMM dd, yyyy",
        )}`,

        cutoffStart: format(new Date(year, month, 11), "yyyy-MM-dd"),

        cutoffEnd: format(new Date(year, month, 25), "yyyy-MM-dd"),

        payoutDate: format(endOfMonth(new Date(year, month)), "yyyy-MM-dd"),

        payrollType: "Semi-Monthly",
      });

      periods.push({
        label: `${format(new Date(year, month - 1, 26), "MMM dd")} - ${format(
          new Date(year, month, 10),
          "MMM dd, yyyy",
        )}`,

        cutoffStart: format(new Date(year, month - 1, 26), "yyyy-MM-dd"),

        cutoffEnd: format(new Date(year, month, 10), "yyyy-MM-dd"),

        payoutDate: format(new Date(year, month, 15), "yyyy-MM-dd"),

        payrollType: "Semi-Monthly",
      });

      current = new Date(year, month - 1, 1);
    }

    return periods.slice(0, count);
  }

  /**
   * =====================================
   * DRIVERS / HELPERS / LABOR
   * =====================================
   */
  if (
    [
      "CdcDriver",
      "CdcHelper",
      "CpdcDriver",
      "CpdcHelper",
      "Dumptruck",
      "Labor",
    ].includes(department)
  ) {
    let current = new Date(today);

    for (let i = 0; i < count; i++) {
      const year = current.getFullYear();

      const month = current.getMonth();

      periods.push({
        label: `${format(new Date(year, month, 1), "MMM dd")} - ${format(
          new Date(year, month, 15),
          "MMM dd, yyyy",
        )}`,

        cutoffStart: format(new Date(year, month, 1), "yyyy-MM-dd"),

        cutoffEnd: format(new Date(year, month, 15), "yyyy-MM-dd"),

        payoutDate: format(endOfMonth(new Date(year, month)), "yyyy-MM-dd"),

        payrollType: "Semi-Monthly",
      });

      periods.push({
        label: `${format(new Date(year, month, 16), "MMM dd")} - ${format(
          endOfMonth(new Date(year, month)),
          "MMM dd, yyyy",
        )}`,

        cutoffStart: format(new Date(year, month, 16), "yyyy-MM-dd"),

        cutoffEnd: format(endOfMonth(new Date(year, month)), "yyyy-MM-dd"),

        payoutDate: format(new Date(year, month + 1, 15), "yyyy-MM-dd"),

        payrollType: "Semi-Monthly",
      });

      current = new Date(year, month - 1, 1);
    }

    return periods.slice(0, count);
  }

  return [];
};
