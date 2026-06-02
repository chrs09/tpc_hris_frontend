import {
  format,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export const getPayrollCutoff = (
  department,
  referenceDate = new Date(),
) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  switch (department) {
    /**
     * =====================================
     * ADMIN
     * 11-25 -> payout 30/31
     * 26-10 -> payout 15
     * =====================================
     */
    case "Admin": {
      const day = referenceDate.getDate();

      if (day >= 11 && day <= 25) {
        const cutoffStart = new Date(year, month, 11);
        const cutoffEnd = new Date(year, month, 25);

        const payoutDate = endOfMonth(
          new Date(year, month),
        );

        return {
          cutoffStart: format(
            cutoffStart,
            "yyyy-MM-dd",
          ),
          cutoffEnd: format(
            cutoffEnd,
            "yyyy-MM-dd",
          ),
          payoutDate: format(
            payoutDate,
            "yyyy-MM-dd",
          ),
          payrollType: "Semi-Monthly",
        };
      }

      // 26 → 10
      const cutoffStart =
        day >= 26
          ? new Date(year, month, 26)
          : new Date(year, month - 1, 26);

      const cutoffEnd =
        day >= 26
          ? new Date(year, month + 1, 10)
          : new Date(year, month, 10);

      const payoutDate =
        day >= 26
          ? new Date(year, month + 1, 15)
          : new Date(year, month, 15);

      return {
        cutoffStart: format(
          cutoffStart,
          "yyyy-MM-dd",
        ),
        cutoffEnd: format(
          cutoffEnd,
          "yyyy-MM-dd",
        ),
        payoutDate: format(
          payoutDate,
          "yyyy-MM-dd",
        ),
        payrollType: "Semi-Monthly",
      };
    }

    /**
     * =====================================
     * MOTORPOOL
     * THURSDAY -> WEDNESDAY
     * PAYOUT SATURDAY
     * =====================================
     */
    case "Motorpool": {
      const current = new Date(referenceDate);

      while (current.getDay() !== 4) {
        current.setDate(
          current.getDate() - 1,
        );
      }

      const cutoffStart = new Date(
        current,
      );

      const cutoffEnd = new Date(
        current,
      );

      cutoffEnd.setDate(
        cutoffEnd.getDate() + 6,
      );

      const payoutDate = new Date(
        cutoffEnd,
      );

      payoutDate.setDate(
        payoutDate.getDate() + 3,
      );

      return {
        cutoffStart: format(
          cutoffStart,
          "yyyy-MM-dd",
        ),
        cutoffEnd: format(
          cutoffEnd,
          "yyyy-MM-dd",
        ),
        payoutDate: format(
          payoutDate,
          "yyyy-MM-dd",
        ),
        payrollType: "Weekly",
      };
    }

    /**
     * =====================================
     * DRIVERS / HELPERS
     * 1-15 -> 30
     * 16-EOM -> 15 NEXT MONTH
     * =====================================
     */
    case "CdcDriver":
    case "CdcHelper":
    case "Dumptruck":
    case "Labor": {
      const day = referenceDate.getDate();

      if (day <= 15) {
        return {
          cutoffStart: format(
            new Date(year, month, 1),
            "yyyy-MM-dd",
          ),
          cutoffEnd: format(
            new Date(year, month, 15),
            "yyyy-MM-dd",
          ),
          payoutDate: format(
            endOfMonth(
              new Date(year, month),
            ),
            "yyyy-MM-dd",
          ),
          payrollType: "Semi-Monthly",
        };
      }

      return {
        cutoffStart: format(
          new Date(year, month, 16),
          "yyyy-MM-dd",
        ),
        cutoffEnd: format(
          endOfMonth(
            new Date(year, month),
          ),
          "yyyy-MM-dd",
        ),
        payoutDate: format(
          new Date(year, month + 1, 15),
          "yyyy-MM-dd",
        ),
        payrollType: "Semi-Monthly",
      };
    }

    default:
      return {
        cutoffStart: format(
          startOfMonth(referenceDate),
          "yyyy-MM-dd",
        ),
        cutoffEnd: format(
          endOfMonth(referenceDate),
          "yyyy-MM-dd",
        ),
        payoutDate: format(
          endOfMonth(referenceDate),
          "yyyy-MM-dd",
        ),
        payrollType: "Unknown",
      };
  }
};