import React from "react";

const formatCurrency = (amount) =>
  `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value) => Number(value || 0).toFixed(2);

const PayslipValue = ({ label, value, isMoney = false, negative = false, strong = false }) => (
  <div className={`grid grid-cols-[1fr_auto] gap-3 border-b border-gray-200 py-0.5 ${strong ? "font-bold" : ""}`}>
    <span>{label}</span>
    <span className={`tabular-nums text-right ${negative ? "text-red-700" : ""}`}>
      {negative ? "-" : ""}
      {isMoney ? formatCurrency(value) : value}
    </span>
  </div>
);

const PayrollSlip = ({ payroll, activePeriod, index }) => {
  const { employee } = payroll;
  const isTripBasedEmployee = payroll.isTripBasedEmployee === true;

  const earnings = isTripBasedEmployee
    ? [{ label: "Trip Pay", amount: payroll.tripPay }]
    : [
        {
          label: "Basic Pay",
          amount: payroll.isMonthlyRateType
            ? payroll.semiMonthlyBasic
            : payroll.basicPay,
        },
        {
          label: "Allowance",
          amount: payroll.isMonthlyRateType
            ? payroll.semiMonthlyAllowance
            : payroll.allowancePay,
        },
        { label: "OT Pay", amount: payroll.otPay },
        {
          label: "Holiday Pay",
          amount: Number(payroll.shPay || 0) + Number(payroll.rhPay || 0),
        },
        {
          label: "Other Earnings",
          amount: Number(payroll.leavePay || 0) + Number(payroll.others || 0),
        },
      ];

  const grossPay = earnings.reduce((total, item) => total + Number(item.amount || 0), 0);

  const deductions = [
    { label: "Absent Deduction", amount: payroll.absentDeduction },
    { label: "UT / Tardiness", amount: payroll.undertimeDeduction },
    { label: "Cash Advance", amount: payroll.cashAdvance },
    { label: "SSS", amount: payroll.sssDeduction },
    { label: "Pag-IBIG", amount: payroll.pagibigDeduction },
    { label: "PhilHealth", amount: payroll.philhealthDeduction },
    { label: "Withholding Tax", amount: payroll.withholdingTax },
    { label: "SSS Loan", amount: payroll.sssLoan },
    { label: "Other Deductions", amount: payroll.personalDeduction },
  ];

  const totalDeductions = deductions.reduce(
    (total, item) => total + Number(item.amount || 0),
    0,
  );

  const position = employee.position || employee.job_title || employee.designation || "—";

  return (
    <article className="payslip-card overflow-hidden border border-black bg-white text-[10px] leading-tight text-black">
      <div className="bg-[#548235] py-1 text-center text-sm font-bold text-white">
        TYTAN PRIME CORPORATION
      </div>

      <div className="grid grid-cols-2 gap-x-8 px-3 pt-2">
        <div className="grid grid-cols-[86px_1fr] gap-y-1">
          <span className="font-bold">Employee Name</span>
          <span className="border-b border-black px-1 font-medium">
            {employee.first_name} {employee.last_name}
          </span>
          <span className="font-bold">Employee ID</span>
          <span className="border-b border-black px-1">{employee.id}</span>
        </div>
        <div className="grid grid-cols-[78px_1fr] gap-y-1">
          <span className="font-bold">Payroll Week</span>
          <span className="border-b border-black px-1 text-right">{activePeriod.label}</span>
          <span className="font-bold">Position</span>
          <span className="border-b border-black px-1">{position}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 px-3 pt-3">
        <section>
          <h3 className="bg-[#d9e2f3] px-1 py-0.5 text-xs font-bold">EARNINGS</h3>
          {isTripBasedEmployee ? (
            <PayslipValue label="Total Trips" value={payroll.totalTrips || 0} />
          ) : (
            <>
              <PayslipValue label="Working Days" value={payroll.daysWorked || 0} />
              <PayslipValue label="Daily Rate" value={payroll.dailyRate} isMoney />
              <PayslipValue label="Total Manhours" value={formatNumber(payroll.renderedHours)} />
            </>
          )}
          {earnings.map((item) => (
            <PayslipValue key={item.label} label={item.label} value={item.amount} isMoney />
          ))}
          <PayslipValue label="Gross Pay" value={grossPay} isMoney strong />
        </section>

        <section>
          <h3 className="bg-[#d9e2f3] px-1 py-0.5 text-xs font-bold">DEDUCTIONS</h3>
          {deductions.length > 0 ? (
            deductions.map((item) => (
              <PayslipValue
                key={item.label}
                label={item.label}
                value={item.amount}
                isMoney
                negative
              />
            ))
          ) : (
            <PayslipValue label="No deductions" value="—" />
          )}
          <PayslipValue
            label="Total Deductions"
            value={totalDeductions}
            isMoney
            negative
            strong
          />
        </section>
      </div>

      <div className="mx-3 mt-2 grid grid-cols-[1fr_auto] items-center border border-black px-2 py-1">
        <span className="text-sm font-bold">NET PAY</span>
        <span className="text-lg font-bold tabular-nums">{formatCurrency(payroll.netPay)}</span>
      </div>

      <div className="mt-9 grid grid-cols-3 gap-5 px-3 text-[9px]">
        {/* <div className="border-t border-black pt-1">Prepared by</div>
        <div className="border-t border-black pt-1">Approved by</div> */}
        <div className="border-t border-black pt-1">Employee Signature</div>
      </div>
      <p className="px-3 pb-2 pt-1 text-[8px] text-gray-500">
        Generated payslip #{index + 1} • Payout date: {activePeriod.payoutDate}
      </p>
    </article>
  );
};

const PayslipModal = ({ isOpen, onClose, payrolls, activePeriod }) => {
  if (!isOpen || !payrolls?.length || !activePeriod) return null;

  const payslipPages = payrolls.reduce((pages, payroll, index) => {
    if (index % 3 === 0) {
      pages.push([]);
    }

    pages[pages.length - 1].push(payroll);
    return pages;
  }, []);

  return (
    <div className="payslip-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <style>{`
        @page { size: 8.5in 13in; margin: 0.22in; }

        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #payslips-print, #payslips-print * { visibility: visible; }
          .payslip-overlay {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .payslip-actions { display: none !important; }
          #payslips-print {
            position: absolute;
            inset: 0;
            width: 100%;
            max-width: none;
            max-height: none;
            overflow: visible;
            box-shadow: none;
          }
          .payslip-list { display: block !important; }
          .payslip-list {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          .payslip-print-page {
            box-sizing: border-box;
            display: grid !important;
            grid-template-rows: repeat(3, 4.08in);
            row-gap: 0.08in !important;
            height: 12.40in;
            margin: 0 !important;
            padding: 0 !important;
            break-after: page;
            page-break-after: always;
          }
          .payslip-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .payslip-card {
            box-sizing: border-box;
            height: 4.08in;
            min-height: 0;
            margin: 0 !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div
        id="payslips-print"
        className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl bg-gray-100 shadow-xl"
      >
        <div className="payslip-actions sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
          <div>
            <h2 className="text-lg font-bold">Payslip Preview</h2>
            <p className="text-sm text-gray-500">
              {payrolls.length} payslip{payrolls.length === 1 ? "" : "s"} • Three slips per long bond-paper page
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="payslip-list flex flex-col gap-3 p-3">
          {payslipPages.map((page, pageIndex) => (
            <section key={pageIndex} className="payslip-print-page flex flex-col gap-3">
              {page.map((payroll, payslipIndex) => (
                <PayrollSlip
                  key={payroll.employee.id}
                  payroll={payroll}
                  activePeriod={activePeriod}
                  index={pageIndex * 3 + payslipIndex}
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
