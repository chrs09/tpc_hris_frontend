import React from "react";

// =====================================================
// FORMATTERS
// =====================================================

const formatCurrency = (amount) =>
  `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value) => Number(value || 0).toFixed(2);

// =====================================================
// PAYSLIP VALUE ROW
// =====================================================

const PayslipValue = ({
  label,
  value,
  isMoney = false,
  negative = false,
  bold = false,
  italic = false,
}) => (
  <div
    className={`
      grid
      grid-cols-[1fr_auto]
      items-center
      gap-2
      border-b
      border-gray-200
      py-px
      text-[7.5px]
      leading-none
      ${bold ? "font-bold" : ""}
      ${italic ? "italic" : ""}
    `}
  >
    <span>{label}</span>

    <span
      className={`
        text-right
        tabular-nums
        ${negative ? "text-red-600" : "text-black"}
      `}
    >
      {negative ? "-" : ""}

      {isMoney ? formatCurrency(value) : value}
    </span>
  </div>
);

// =====================================================
// SECTION HEADER
// =====================================================

const SectionHeader = ({ children }) => (
  <h3
    className="
      mt-0.5
      bg-[#d9e2f3]
      px-1.5
      py-px
      text-[7.5px]
      font-bold
      uppercase
      leading-none
    "
  >
    {children}
  </h3>
);

// =====================================================
// PAYROLL SLIP
// =====================================================

const PayrollSlip = ({ payroll, activePeriod, index }) => {
  const { employee = {} } = payroll;

  // ===================================================
  // EMPLOYEE TYPE
  // ===================================================

  const isTripBasedEmployee = payroll.isTripBasedEmployee === true;

  const isMonthly =
    payroll.isMonthlyRateType === true ||
    String(
      payroll.payrollType ||
        payroll.payroll_type ||
        employee.payrollType ||
        employee.payroll_type ||
        "",
    ).toLowerCase() === "monthly";

  // ===================================================
  // EMPLOYEE INFORMATION
  // ===================================================

  const employeeName =
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "—";

  const position =
    employee.position || employee.job_title || employee.designation || "—";

  const employeeId = employee.id ?? payroll.employeeId ?? "—";

  // ===================================================
  // ATTENDANCE HOURS
  //
  // regularHours is the real, attendance-based figure PayrollList
  // already computed for this cutoff (via calculateAttendanceHours,
  // schedule-aware per employee/day) - the same number that produced
  // basicPay. It is shown directly rather than a hypothetical "full
  // attendance" estimate, so the payslip can never disagree with
  // what PayrollList/PayrollDetailModal show for the same employee.
  //
  // totalScheduledHours is the transparency figure: the sum of every
  // record's own scheduled hours for the cutoff (present or absent),
  // i.e. what this payslip would be worth with perfect attendance -
  // no absences, no half-days, no undertime. regularHours is what was
  // actually earned; the difference is what the deductions below add
  // up to.
  // ===================================================

  const totalScheduledHours = Number(payroll.totalScheduledHours ?? 0);

  const regularHours = Number(payroll.regularHours ?? 0);

  const absentDays = Number(payroll.absentDays ?? 0);

  const absentHours = Number(payroll.absentHours ?? 0);

  const firstHalfAbsentHours = Number(payroll.firstHalfAbsentHours ?? 0);

  const secondHalfAbsentHours = Number(payroll.secondHalfAbsentHours ?? 0);

  // Overtime hours shown must match what Overtime Pay was actually
  // computed from (approvedOTHours), not the raw detected OT - those
  // two can differ once OT approval trims the detected hours down.
  const overtimeHours = Number(
    payroll.approvedOTHours ?? payroll.otHours ?? payroll.overtimeHours ?? 0,
  );

  const undertimeHours = Number(payroll.undertimeHours ?? 0);

  const tardinessHours = Number(payroll.tardinessHours ?? 0);

  // ===================================================
  // RATES
  // ===================================================

  const dailyRate = Number(payroll.dailyRate ?? 0);

  // ===================================================
  // ATTENDANCE DEDUCTIONS
  // ===================================================

  const absentDeduction = Number(payroll.absentDeduction ?? 0);

  const undertimeDeduction = Number(payroll.undertimeDeduction ?? 0);

  const tardinessDeduction = Number(payroll.tardinessDeduction ?? 0);

  // ===================================================
  // BASIC PAY
  //
  // WEEKLY:
  //   payroll.basicPay
  //
  // MONTHLY:
  //   payroll.semiMonthlyBasic
  //
  // Do not calculate another basic pay here.
  // ===================================================

  const basicPay = Number(
    isMonthly
      ? (payroll.semiMonthlyBasic ?? payroll.basicPay ?? 0)
      : (payroll.basicPay ?? 0),
  );

  // ===================================================
  // ADJUSTED BASIC PAY
  //
  // This should already come from payroll calculation.
  //
  // Example:
  //
  // Basic Pay                  4,800
  // Absent Deduction            400
  // Tardiness Deduction          68
  // --------------------------------
  // Adjusted Basic Pay         4,332
  // ===================================================

  const adjustedBasicPay = Number(
    payroll.adjustedBasicPay ??
      basicPay - absentDeduction - undertimeDeduction - tardinessDeduction,
  );

  // ===================================================
  // OTHER EARNINGS
  // ===================================================

  const allowancePay = Number(
    payroll.isMonthlyRateType
      ? (payroll.adjustedAllowancePay ??
          payroll.semiMonthlyAllowance ??
          payroll.allowancePay ??
          0)
      : (payroll.allowancePay ?? 0),
  );

  const otPay = Number(payroll.otPay ?? 0);

  const shPay = Number(payroll.shPay ?? 0);

  const rhPay = Number(payroll.rhPay ?? 0);

  const leavePay = Number(payroll.leavePay ?? 0);

  const otherEarnings = Number(payroll.others ?? 0);

  // ===================================================
  // TOTAL OTHER EARNINGS
  // ===================================================

  const totalOtherEarnings =
    allowancePay + otPay + shPay + rhPay + leavePay + otherEarnings;

  // ===================================================
  // TOTAL EARNINGS
  //
  // Adjusted Basic Pay already reflects attendance
  // deductions.
  //
  // Therefore:
  //
  // Adjusted Basic
  // + Other Earnings
  // = Total Earnings
  // ===================================================

  const calculatedTotalEarnings = adjustedBasicPay + totalOtherEarnings;

  // ===================================================
  // GROSS PAY
  //
  // Payroll calculation is the source of truth.
  //
  // The calculated value is only a fallback for older
  // payroll records that may not contain grossPay.
  // ===================================================

  const grossPay = Number(payroll.grossPay ?? calculatedTotalEarnings);

  // ===================================================
  // GOVERNMENT CONTRIBUTIONS
  // ===================================================

  const sss = Number(payroll.sssDeduction ?? 0);

  const philhealth = Number(payroll.philhealthDeduction ?? 0);

  const pagibig = Number(payroll.pagibigDeduction ?? 0);

  const withholdingTax = Number(payroll.withholdingTax ?? 0);

  // ===================================================
  // OTHER DEDUCTIONS
  // ===================================================

  const sssLoan = Number(payroll.sssLoan ?? 0);

  const cashAdvance = Number(payroll.cashAdvance ?? 0);

  const personalDeduction = Number(payroll.personalDeduction ?? 0);

  // ===================================================
  // GOVERNMENT TOTAL
  // ===================================================

  const totalGovernmentDeductions = sss + philhealth + pagibig + withholdingTax;

  // ===================================================
  // OTHER DEDUCTION TOTAL
  // ===================================================

  const totalOtherDeductions = sssLoan + cashAdvance + personalDeduction;

  // ===================================================
  // TOTAL DEDUCTIONS
  //
  // Attendance deductions are already reflected in
  // Adjusted Basic Pay / Gross Pay.
  //
  // Therefore they MUST NOT be added again here.
  //
  // This prevents double deduction on the payslip.
  // ===================================================

  const totalDeductions = totalGovernmentDeductions + totalOtherDeductions;

  // ===================================================
  // NET PAY
  //
  // Always prefer the payroll-calculated netPay.
  // ===================================================

  const netPay = Number(payroll.netPay ?? grossPay - totalDeductions);

  // ===================================================
  // TRIP-BASED PAYSLIP
  // ===================================================

  if (isTripBasedEmployee) {
    return (
      <article
        className="
          payslip-card
          border
          border-black
          bg-white
          text-[9px]
          leading-tight
          text-black
        "
      >
        {/* HEADER */}

        <div className="bg-[#548235] py-1 text-center text-[10px] font-bold text-white">
          TYTAN PRIME CORPORATION
        </div>

        {/* EMPLOYEE INFORMATION */}

        <div className="grid grid-cols-2 gap-x-4 px-2 pt-1">
          <div className="grid grid-cols-[58px_1fr] gap-y-0.5">
            <span className="font-bold">Employee</span>

            <span className="border-b border-black">{employeeName}</span>

            <span className="font-bold">ID</span>

            <span className="border-b border-black">{employeeId}</span>
          </div>

          <div className="grid grid-cols-[58px_1fr] gap-y-0.5">
            <span className="font-bold">Period</span>

            <span className="border-b border-black text-right">
              {activePeriod.label}
            </span>

            <span className="font-bold">Position</span>

            <span className="border-b border-black">{position}</span>
          </div>
        </div>

        {/* CONTENT */}

        <div className="grid grid-cols-2 gap-x-4 px-2 pt-1">
          {/* LEFT */}

          <section>
            <SectionHeader>Earnings</SectionHeader>

            <PayslipValue label="Total Trips" value={payroll.totalTrips || 0} />

            <PayslipValue
              label="Trip Pay"
              value={payroll.tripPay}
              isMoney
              bold
            />

            <PayslipValue
              label="Total Earnings"
              value={grossPay}
              isMoney
              bold
            />
          </section>

          {/* RIGHT */}

          <section>
            <SectionHeader>Deductions</SectionHeader>

            <PayslipValue label="SSS" value={sss} isMoney negative />

            <PayslipValue
              label="PhilHealth"
              value={philhealth}
              isMoney
              negative
            />

            <PayslipValue label="Pag-IBIG" value={pagibig} isMoney negative />

            <PayslipValue
              label="Withholding Tax"
              value={withholdingTax}
              isMoney
              negative
            />

            <PayslipValue
              label="Other Deductions"
              value={totalOtherDeductions}
              isMoney
              negative
            />

            <PayslipValue
              label="Total Deductions"
              value={totalDeductions}
              isMoney
              negative
              bold
            />
          </section>
        </div>

        {/* NET PAY */}

        <div className="mx-2 mt-1 grid grid-cols-[1fr_auto] items-center border-2 border-black px-2 py-1">
          <span className="font-bold">NET PAY</span>

          <span className="text-[12px] font-bold tabular-nums">
            {formatCurrency(netPay)}
          </span>
        </div>

        {/* SIGNATURE */}

        <div className="mt-2 px-2 text-[7px]">
          <div className="w-40 border-t border-black pt-0.5">
            Employee Signature
          </div>
        </div>

        <p className="px-2 pb-0.5 pt-0.5 text-[6px] text-gray-500">
          Payslip #{index + 1}
          {" • "}
          Payout: {activePeriod.payoutDate}
        </p>
      </article>
    );
  }

  // ===================================================
  // STANDARD WEEKLY / MONTHLY PAYSLIP
  // ===================================================

  return (
    <article
      className="
        payslip-card
        border
        border-black
        bg-white
        text-[8px]
        leading-tight
        text-black
      "
    >
      {/* =================================================
          COMPANY HEADER
      ================================================= */}

      <div className="bg-[#548235] py-1 text-center text-[10px] font-bold text-white">
        TYTAN PRIME CORPORATION
      </div>

      {/* =================================================
          PAYSLIP TITLE
      ================================================= */}

      <div className="px-2 pt-0.5 text-center">
        <div className="text-[9px] font-bold uppercase">Employee Payslip</div>
      </div>

      {/* =================================================
          EMPLOYEE INFORMATION
      ================================================= */}

      <div className="grid grid-cols-2 gap-x-4 px-2 pt-0.5">
        {/* LEFT */}

        <div className="grid grid-cols-[65px_1fr] gap-y-0.5">
          <span className="font-bold">Employee</span>

          <span className="border-b border-black">{employeeName}</span>

          <span className="font-bold">Employee ID</span>

          <span className="border-b border-black">{employeeId}</span>

          <span className="font-bold">Position</span>

          <span className="border-b border-black">{position}</span>
        </div>

        {/* RIGHT */}

        <div className="grid grid-cols-[65px_1fr] gap-y-0.5">
          <span className="font-bold">Payroll Type</span>

          <span className="border-b border-black text-right">
            {isMonthly ? "Monthly" : "Weekly"}
          </span>

          <span className="font-bold">Pay Period</span>

          <span className="border-b border-black text-right">
            {activePeriod.label}
          </span>

          <span className="font-bold">Payout Date</span>

          <span className="border-b border-black text-right">
            {activePeriod.payoutDate || "—"}
          </span>
        </div>
      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="grid grid-cols-2 gap-x-4 px-2 pt-0.5">
        {/* =================================================
            LEFT COLUMN
        ================================================= */}

        <section>
          {/* =================================================
              EARNINGS
          ================================================= */}

          <SectionHeader>Earnings</SectionHeader>

          <PayslipValue label="Working Days" value={payroll.daysWorked ?? 0} />

          <PayslipValue label="Daily Rate" value={dailyRate} isMoney />

          {/* SCHEDULED / REGULAR HOURS */}

          <PayslipValue
            label="Total Scheduled Hours"
            value={formatNumber(totalScheduledHours)}
          />

          <PayslipValue
            label="Total Regular Hours"
            value={formatNumber(regularHours)}
            bold
          />

          {/* BASIC PAY */}

          <PayslipValue
            label={isMonthly ? "Semi-Monthly Basic" : "Basic Pay"}
            value={basicPay}
            isMoney
            bold
          />

          {/* =================================================
              ATTENDANCE ADJUSTMENTS
          ================================================= */}

          <SectionHeader>Attendance Adjustments</SectionHeader>

          {/* Starting point: the full scheduled hours this cutoff is
              worth, before any of the deductions below are applied. */}
          <PayslipValue
            label="Total Scheduled Hours"
            value={formatNumber(totalScheduledHours)}
            italic
          />

          {/* ABSENCE */}

          <PayslipValue label="Absent Days" value={absentDays} />

          <PayslipValue
            label="Absent Hours"
            value={formatNumber(absentHours)}
            bold={absentHours > 0}
          />

          {firstHalfAbsentHours > 0 && (
            <PayslipValue
              label="1st Half Absent Hours"
              value={formatNumber(firstHalfAbsentHours)}
            />
          )}

          {secondHalfAbsentHours > 0 && (
            <PayslipValue
              label="2nd Half Absent Hours"
              value={formatNumber(secondHalfAbsentHours)}
            />
          )}

          <PayslipValue
            label="Absent Deduction"
            value={absentDeduction}
            isMoney
            negative
            italic
          />

          {/* UNDERTIME */}

          <PayslipValue
            label="Undertime Hours"
            value={formatNumber(undertimeHours)}
            bold={undertimeHours > 0}
          />

          <PayslipValue
            label="Undertime Deduction"
            value={undertimeDeduction}
            isMoney
            negative
            italic
          />

          {/* TARDINESS */}

          <PayslipValue
            label="Tardiness Hours"
            value={formatNumber(tardinessHours)}
            bold={tardinessHours > 0}
          />

          <PayslipValue
            label="Tardiness Deduction"
            value={tardinessDeduction}
            isMoney
            negative
            italic
          />

          {/* ADJUSTED BASIC */}

          <div className="mt-0.5 border-t border-black pt-0.5">
            <PayslipValue
              label="Adjusted Basic Pay"
              value={adjustedBasicPay}
              isMoney
              bold
            />
          </div>

          {/* =================================================
              OTHER EARNINGS
          ================================================= */}

          <SectionHeader>Other Earnings</SectionHeader>

          <PayslipValue
            label="Overtime Hours"
            value={formatNumber(overtimeHours)}
            bold={overtimeHours > 0}
          />

          <PayslipValue label="Overtime Pay" value={otPay} isMoney />

          <PayslipValue label="Special Holiday Premium" value={shPay} isMoney />

          <PayslipValue label="Regular Holiday Premium" value={rhPay} isMoney />

          <PayslipValue label="Allowance" value={allowancePay} isMoney />

          <PayslipValue label="Leave Pay" value={leavePay} isMoney />

          <PayslipValue label="Other Earnings" value={otherEarnings} isMoney />

          {/* =================================================
              TOTAL EARNINGS
          ================================================= */}

          <div className="mt-0.5 border-t-2 border-black pt-0.5">
            <PayslipValue
              label="TOTAL EARNINGS"
              value={grossPay}
              isMoney
              bold
            />
          </div>
        </section>

        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <section>
          {/* =================================================
              GOVERNMENT CONTRIBUTIONS
          ================================================= */}

          <SectionHeader>Government Contributions</SectionHeader>

          <PayslipValue label="SSS" value={sss} isMoney negative />

          <PayslipValue
            label="PhilHealth"
            value={philhealth}
            isMoney
            negative
          />

          <PayslipValue label="Pag-IBIG" value={pagibig} isMoney negative />

          <PayslipValue
            label="Withholding Tax"
            value={withholdingTax}
            isMoney
            negative
          />

          {/* =================================================
              OTHER DEDUCTIONS
          ================================================= */}

          <SectionHeader>Other Deductions</SectionHeader>

          <PayslipValue label="SSS Loan" value={sssLoan} isMoney negative />

          <PayslipValue
            label="Cash Advance"
            value={cashAdvance}
            isMoney
            negative
          />

          <PayslipValue
            label="Other Deductions"
            value={personalDeduction}
            isMoney
            negative
          />

          {/* =================================================
              TOTAL DEDUCTIONS
          ================================================= */}

          <div className="mt-0.5 border-t-2 border-black pt-0.5">
            <PayslipValue
              label="TOTAL DEDUCTIONS"
              value={totalDeductions}
              isMoney
              negative
              bold
            />
          </div>

          {/* =================================================
              PAY CALCULATION SUMMARY
          ================================================= */}

          <SectionHeader>Pay Summary</SectionHeader>

          <PayslipValue
            label="Adjusted Basic Pay"
            value={adjustedBasicPay}
            isMoney
            bold
          />

          <PayslipValue
            label="Other Earnings"
            value={totalOtherEarnings}
            isMoney
          />

          <PayslipValue label="Gross Pay" value={grossPay} isMoney bold />

          {/* =================================================
              NET PAY
          ================================================= */}

          <div className="mt-1 border-2 border-black px-2 py-0.5">
            <div className="text-[7.5px] font-bold uppercase">NET PAY</div>

            <div className="text-right text-[12px] font-bold tabular-nums">
              {formatCurrency(netPay)}
            </div>
          </div>
        </section>
      </div>

      {/* =================================================
          SIGNATURE
      ================================================= */}

      <div className="mt-1 px-2 text-[7px]">
        <div className="w-40 border-t border-black pt-px">
          Employee Signature
        </div>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <p className="px-2 pb-px pt-px text-[6px] text-gray-500">
        Payslip #{index + 1}
        {" • "}
        Payout: {activePeriod.payoutDate}
      </p>
    </article>
  );
};

// =====================================================
// PAYSLIP MODAL
// =====================================================

const PayslipModal = ({ isOpen, onClose, payrolls, activePeriod }) => {
  if (!isOpen || !payrolls?.length || !activePeriod) {
    return null;
  }

  // ===================================================
  // THREE PAYSLIPS PER LONG BOND PAPER
  // ===================================================

  const SLIPS_PER_PAGE = 3;

  const payslipPages = payrolls.reduce((pages, payroll, index) => {
    if (index % SLIPS_PER_PAGE === 0) {
      pages.push([]);
    }

    pages[pages.length - 1].push(payroll);

    return pages;
  }, []);

  return (
    <div
      className="
        payslip-overlay
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
    >
      {/* =================================================
          PRINT CSS
      ================================================= */}

      <style>{`

        @page {
          size: 8.5in 13in;
          margin: 0.15in;
        }


        @media print {

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;

            width: 8.5in !important;
            height: 13in !important;

            overflow: visible !important;

            position: relative !important;
          }


          /*
           * Hide application UI.
           */

          body * {
            visibility: hidden;
          }


          /*
           * Show payslips only.
           */

          #payslips-print,
          #payslips-print * {
            visibility: visible;
          }


          /*
           * Remove modal styling.
           */

          .payslip-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;

            display: block !important;

            width: 100% !important;
            height: 100% !important;

            margin: 0 !important;
            padding: 0 !important;

            background: transparent !important;
          }


          /*
           * Hide buttons.
           */

          .payslip-actions {
            display: none !important;
          }


          /*
           * PRINT CONTAINER
           */

          #payslips-print {

            position: absolute !important;
            top: 0 !important;
            left: 0 !important;

            width: 100% !important;

            max-width: none !important;
            max-height: none !important;

            overflow: visible !important;

            margin: 0 !important;
            padding: 0 !important;

            background: white !important;

            box-shadow: none !important;
          }


          /*
           * PAYSLIP LIST
           */

          .payslip-list {

            display: block !important;

            width: 100% !important;

            margin: 0 !important;
            padding: 0 !important;
          }


          /*
           * THREE PAYSLIPS PER LONG BOND PAPER
           *
           * Long bond: 8.5 × 13 inches, 0.15in page margin
           * -> usable height = 12.7in.
           *
           * 3 rows + 2 row-gaps of 0.08in = 12.61in, leaving a small
           * safety margin under the 12.7in usable height.
           *
           * Each payslip: 4.15 inches.
           */

          .payslip-print-page {

            box-sizing: border-box;

            display: grid !important;

            grid-template-rows:
              repeat(
                3,
                4.15in
              );

            row-gap: 0.08in !important;

            width: 100% !important;

            height: 12.61in !important;

            margin: 0 !important;
            padding: 0 !important;

            break-inside: avoid !important;

            page-break-inside: avoid !important;

            break-after: page !important;

            page-break-after: always !important;
          }


          /*
           * LAST PAGE
           */

          .payslip-print-page:last-child {

            break-after: auto !important;

            page-break-after: auto !important;
          }


          /*
           * INDIVIDUAL PAYSLIP
           */

          .payslip-card {

          box-sizing: border-box;

          width: 100% !important;

          height: 4.15in !important;

          min-height: 4.15in !important;

          max-height: 4.15in !important;

          margin: 0 !important;

          padding: 0 !important;

          overflow: hidden !important;

          break-inside: avoid !important;

          page-break-inside: avoid !important;

          break-before: auto !important;

          break-after: auto !important;

          page-break-before: auto !important;

          page-break-after: auto !important;

          font-size: 8px !important;

          line-height: 1.1 !important;
        }

      `}</style>

      {/* =================================================
          MODAL CONTAINER
      ================================================= */}

      <div
        id="payslips-print"
        className="
          w-full
          max-w-5xl
          max-h-[94vh]
          overflow-auto
          rounded-xl
          bg-background
          shadow-xl
        "
      >
        {/* =================================================
            MODAL HEADER
        ================================================= */}

        <div
          className="
            payslip-actions
            sticky
            top-0
            z-10
            flex
            items-center
            justify-between
            border-b
            border-border
            bg-surface
            p-4
          "
        >
          <div>
            <h2 className="text-lg font-bold">Payslip Preview</h2>

            <p className="text-sm text-fg-subtle">
              {payrolls.length} payslip
              {payrolls.length === 1 ? "" : "s"}
              {" • "}
              Weekly and Monthly employees
              {" • "}
              Three slips per long bond-paper page
            </p>
          </div>

          {/* ACTIONS */}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="
                rounded-lg
                bg-blue-600
                px-4
                py-2
                text-sm
                font-medium
                text-white
                hover:bg-blue-700
              "
            >
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-lg
                border-border
                border
                px-4
                py-2
                text-sm
                font-medium
                text-fg-muted
                hover:bg-surface-hover
              "
            >
              Close
            </button>
          </div>
        </div>

        {/* =================================================
            PAYSLIP LIST
        ================================================= */}

        <div
          className="
            payslip-list
            flex
            flex-col
            gap-2
            p-2
          "
        >
          {payslipPages.map((page, pageIndex) => (
            <section
              key={pageIndex}
              className="
                  payslip-print-page
                  flex
                  flex-col
                  gap-2
                "
            >
              {page.map((payroll, payslipIndex) => (
                <PayrollSlip
                  key={payroll.employee?.id ?? `${pageIndex}-${payslipIndex}`}
                  payroll={payroll}
                  activePeriod={activePeriod}
                  index={pageIndex * SLIPS_PER_PAGE + payslipIndex}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
