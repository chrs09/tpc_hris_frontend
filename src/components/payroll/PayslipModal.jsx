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
      py-1
      text-[9px]
      leading-tight
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
      mt-1.5
      bg-[#d9e2f3]
      px-1.5
      py-0.75
      text-[9px]
      font-bold
      uppercase
      leading-tight
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
  // IMPORTANT:
  //
  // fullRegularHours represents the employee's
  // scheduled/full-attendance regular hours.
  //
  // It is NOT reduced because of:
  // - absence
  // - undertime
  // - tardiness
  //
  // Example:
  // 6 days × 8 hours = 48 hours.
  //
  // The attendance deductions are shown separately.
  // ===================================================

  const scheduledWorkingDays = Number(
    payroll.scheduledWorkingDays ??
      payroll.scheduledDays ??
      payroll.daysWorked ??
      0,
  );

  const fullRegularHours = Number(
    payroll.fullRegularHours ?? scheduledWorkingDays * 8,
  );

  // const actualRegularHours =
  //   Number(
  //     payroll.regularHours ?? 0
  //   );

  const overtimeHours = Number(payroll.otHours ?? payroll.overtimeHours ?? 0);

  const absentHours = Number(payroll.absentHours ?? 0);

  const undertimeHours = Number(payroll.undertimeHours ?? 0);

  const tardinessHours = Number(payroll.tardinessHours ?? 0);

  // ===================================================
  // RATES
  // ===================================================

  const dailyRate = Number(payroll.dailyRate ?? 0);

  const hourlyRate = Number(payroll.hourlyRate ?? dailyRate / 8);

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
  // FULL ATTENDANCE BASIC PAY
  //
  // This is mainly useful for transparency on weekly
  // employees.
  //
  // For monthly employees, use the payroll-calculated
  // semi-monthly basic when available.
  // ===================================================

  const fullAttendanceBasicPay = Number(
    payroll.fullAttendanceBasicPay ??
      (isMonthly ? basicPay : fullRegularHours * hourlyRate),
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

        <div className="bg-[#548235] py-1.5 text-center text-[11px] font-bold text-white">
          TYTAN PRIME CORPORATION
        </div>

        {/* EMPLOYEE INFORMATION */}

        <div className="grid grid-cols-2 gap-x-4 px-2 pt-1.5">
          <div className="grid grid-cols-[58px_1fr] gap-y-1">
            <span className="font-bold">Employee</span>

            <span className="border-b border-black">{employeeName}</span>

            <span className="font-bold">ID</span>

            <span className="border-b border-black">{employeeId}</span>
          </div>

          <div className="grid grid-cols-[58px_1fr] gap-y-1">
            <span className="font-bold">Period</span>

            <span className="border-b border-black text-right">
              {activePeriod.label}
            </span>

            <span className="font-bold">Position</span>

            <span className="border-b border-black">{position}</span>
          </div>
        </div>

        {/* CONTENT */}

        <div className="grid grid-cols-2 gap-x-4 px-2 pt-2">
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

        <div className="mx-2 mt-2 grid grid-cols-[1fr_auto] items-center border-2 border-black px-2 py-1.5">
          <span className="font-bold">NET PAY</span>

          <span className="text-[13px] font-bold tabular-nums">
            {formatCurrency(netPay)}
          </span>
        </div>

        {/* SIGNATURE */}

        <div className="mt-5 px-2 text-[7px]">
          <div className="w-40 border-t border-black pt-0.5">
            Employee Signature
          </div>
        </div>

        <p className="px-2 pb-1 pt-1 text-[6px] text-gray-500">
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

      <div className="bg-[#548235] py-1.5 text-center text-[11px] font-bold text-white">
        TYTAN PRIME CORPORATION
      </div>

      {/* =================================================
          PAYSLIP TITLE
      ================================================= */}

      <div className="px-2 pt-1.5 text-center">
        <div className="text-[10px] font-bold uppercase">Employee Payslip</div>
      </div>

      {/* =================================================
          EMPLOYEE INFORMATION
      ================================================= */}

      <div className="grid grid-cols-2 gap-x-4 px-2 pt-1">
        {/* LEFT */}

        <div className="grid grid-cols-[65px_1fr] gap-y-1">
          <span className="font-bold">Employee</span>

          <span className="border-b border-black">{employeeName}</span>

          <span className="font-bold">Employee ID</span>

          <span className="border-b border-black">{employeeId}</span>

          <span className="font-bold">Position</span>

          <span className="border-b border-black">{position}</span>
        </div>

        {/* RIGHT */}

        <div className="grid grid-cols-[65px_1fr] gap-y-1">
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

      <div className="grid grid-cols-2 gap-x-4 px-2 pt-2">
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

          {/* FULL ATTENDANCE HOURS */}

          <PayslipValue
            label="Total Regular Hours"
            value={formatNumber(fullRegularHours)}
            bold
          />

          {/* BASIC PAY */}

          <PayslipValue
            label={isMonthly ? "Semi-Monthly Basic" : "Basic Pay"}
            value={fullAttendanceBasicPay}
            isMoney
            bold
          />

          {/* =================================================
              ATTENDANCE ADJUSTMENTS
          ================================================= */}

          <SectionHeader>Attendance Adjustments</SectionHeader>

          {/* ABSENCE */}

          <PayslipValue
            label="Total Absent Hours"
            value={formatNumber(absentHours)}
            bold
          />

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
            bold
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
            bold
          />

          <PayslipValue
            label="Tardiness Deduction"
            value={tardinessDeduction}
            isMoney
            negative
            italic
          />

          {/* ADJUSTED BASIC */}

          <div className="mt-1 border-t border-black pt-1">
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

          <div className="mt-1 border-t-2 border-black pt-1">
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

          <div className="mt-2 border-t-2 border-black pt-1">
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

          <div className="mt-3 border-2 border-black px-2 py-2">
            <div className="text-[9px] font-bold uppercase">NET PAY</div>

            <div className="mt-1 text-right text-[15px] font-bold tabular-nums">
              {formatCurrency(netPay)}
            </div>
          </div>

          {/* =================================================
              EXPLANATION
          ================================================= */}

          <div className="mt-2 border border-gray-300 px-1.5 py-1.5 text-[7px] leading-tight text-gray-600">
            <div className="font-bold text-gray-800">PAYROLL SUMMARY</div>

            <div className="mt-0.5">
              Total Regular Hours represents the scheduled regular hours for the
              payroll period.
            </div>

            <div className="mt-0.5">
              Attendance deductions are shown separately so you can see how
              absences, undertime, and tardiness affect your pay.
            </div>

            <div className="mt-0.5">
              Net Pay is the amount after the applicable deductions.
            </div>
          </div>
        </section>
      </div>

      {/* =================================================
          SIGNATURE
      ================================================= */}

      <div className="mt-5 px-2 text-[7px]">
        <div className="w-40 border-t border-black pt-0.5">
          Employee Signature
        </div>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <p className="px-2 pb-1 pt-1 text-[6px] text-gray-500">
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
  // TWO PAYSLIPS PER LONG BOND PAPER
  // ===================================================

  const payslipPages = payrolls.reduce((pages, payroll, index) => {
    if (index % 2 === 0) {
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
          margin: 0.20in;
        }


        @media print {

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;

            width: 8.5in !important;
            height: 13in !important;

            overflow: visible !important;
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
            position: static !important;

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

            position: static !important;

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
           * TWO PAYSLIPS PER LONG BOND PAPER
           *
           * Long bond:
           *
           * 8.5 × 13 inches
           *
           * Each payslip:
           * approximately 6.15 inches
           */

          .payslip-print-page {

            box-sizing: border-box;

            display: grid !important;

            grid-template-rows:
              repeat(
                2,
                5.95in
              );

            row-gap: 0.12in !important;

            width: 100% !important;

            height: 12.02in !important;

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

          height: 5.95in !important;

          min-height: 5.95in !important;

          max-height: 5.95in !important;

          margin: 0 !important;

          padding: 0 !important;

          overflow: hidden !important;

          break-inside: avoid !important;

          page-break-inside: avoid !important;

          break-before: auto !important;

          break-after: auto !important;

          page-break-before: auto !important;

          page-break-after: auto !important;

          font-size: 9px !important;

          line-height: 1.15 !important;
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
          bg-gray-100
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
            bg-white
            p-4
          "
        >
          <div>
            <h2 className="text-lg font-bold">Payslip Preview</h2>

            <p className="text-sm text-gray-500">
              {payrolls.length} payslip
              {payrolls.length === 1 ? "" : "s"}
              {" • "}
              Weekly and Monthly employees
              {" • "}
              Two slips per long bond-paper page
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
                border
                px-4
                py-2
                text-sm
                font-medium
                text-gray-700
                hover:bg-gray-50
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
                  index={pageIndex * 2 + payslipIndex}
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
