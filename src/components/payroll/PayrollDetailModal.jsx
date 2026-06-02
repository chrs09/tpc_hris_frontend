import React from "react";

const PayrollDetailModal = ({
  isOpen,
  onClose,
  payroll,
  activePeriod,
}) => {
  if (!isOpen || !payroll) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-5">
          <div>
            <h2 className="text-xl font-bold">
              Payroll Details
            </h2>

            <p className="text-sm text-gray-500">
              {payroll.employee.first_name}{" "}
              {payroll.employee.last_name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Payroll Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">
                Payroll Type
              </p>

              <p className="font-semibold">
                {payroll.payrollType}
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">
                Cutoff
              </p>

              <p className="font-semibold">
                {activePeriod.cutoffStart}
              </p>

              <p className="font-semibold">
                {activePeriod.cutoffEnd}
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">
                Payout Date
              </p>

              <p className="font-semibold">
                {activePeriod.payoutDate}
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">
                Daily Rate
              </p>

              <p className="font-semibold">
                ₱
                {Number(
                  payroll.dailyRate,
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="font-semibold mb-3">
              Payroll Summary
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  Days Worked
                </p>

                <p className="font-bold">
                  {payroll.daysWorked}
                </p>
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  Total Hours
                </p>

                <p className="font-bold">
                  {payroll.totalHours.toFixed(
                    2,
                  )}
                </p>
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  OT Hours
                </p>

                <p className="font-bold">
                  {payroll.otHours.toFixed(
                    2,
                  )}
                </p>
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  Basic Pay
                </p>

                <p className="font-bold">
                  ₱
                  {payroll.basicPay.toFixed(
                    2,
                  )}
                </p>
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  OT Pay
                </p>

                <p className="font-bold">
                  ₱
                  {payroll.otPay.toFixed(
                    2,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Gross */}
          <div className="border rounded-xl p-5 bg-green-50">
            <p className="text-sm text-gray-500">
              Gross Payroll
            </p>

            <p className="text-3xl font-bold text-green-700">
              ₱
              {payroll.grossPay.toFixed(
                2,
              )}
            </p>
          </div>

          {/* Validation */}

          <div>
            <h3 className="font-semibold mb-3">
                Attendance Breakdown
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full border">
                <thead className="bg-gray-100">
                    <tr>
                    <th className="border px-3 py-2 text-left">
                        Date
                    </th>

                    <th className="border px-3 py-2 text-left">
                        Time In
                    </th>

                    <th className="border px-3 py-2 text-left">
                        Time Out
                    </th>

                    <th className="border px-3 py-2 text-left">
                        Status
                    </th>

                    <th className="border px-3 py-2 text-left">
                        Hours
                    </th>

                    <th className="border px-3 py-2 text-left">
                        OT
                    </th>
                    <th className="border px-3 py-2 text-left">
                        Face Review
                    </th>
                    <th className="border px-3 py-2 text-left">
                        Trips
                    </th>
                    </tr>
                </thead>

                <tbody>
                    {payroll.records?.map(
                    (record) => {
                        let workedHours = 0;
                        let otHours = 0;

                        if (
                        record.check_in_time_raw &&
                        record.check_out_time_raw
                        ) {
                        const checkIn =
                            new Date(
                            record.check_in_time_raw,
                            );

                        const checkOut =
                            new Date(
                            record.check_out_time_raw,
                            );

                        workedHours =
                            (checkOut - checkIn) /
                            1000 /
                            60 /
                            60;

                        workedHours -= 1;

                        workedHours =
                            Math.max(
                            workedHours,
                            0,
                            );

                        otHours =
                            Math.max(
                            workedHours - 8,
                            0,
                            );
                        }

                        return (
                        <tr
                            key={record.id}
                        >
                            <td className="border px-3 py-2">
                            {
                                record.attendance_date
                            }
                            </td>

                            <td className="border px-3 py-2">
                            {record.check_in_time ||
                                "--"}
                            </td>

                            <td className="border px-3 py-2">
                            {record.check_out_time ||
                                "--"}
                            </td>

                            <td className="border px-3 py-2">
                            {record.status}
                            </td>

                            <td className="border px-3 py-2">
                            {workedHours.toFixed(
                                2,
                            )}
                            </td>

                            <td className="border px-3 py-2">
                            {otHours.toFixed(
                                2,
                            )}
                            </td>
                            <td className="border px-3 py-2">
                            {record.face_review_status ||
                                "N/A"}
                            </td>
                            <td className="border px-3 py-2">
                                {record.completed_trips}
                            </td>
                        </tr>
                        );
                    },
                    )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                    <tr>
                        <td
                        colSpan={4}
                        className="border px-3 py-2"
                        >
                        Totals
                        </td>

                        <td className="border px-3 py-2">
                        {payroll.totalHours.toFixed(
                            2,
                        )}
                        </td>

                        <td className="border px-3 py-2">
                        {payroll.otHours.toFixed(
                            2,
                        )}
                        </td>
                    </tr>
                </tfoot>
                </table>
            </div>
            </div>
          <div>
            <h3 className="font-semibold mb-2">
              Validation
            </h3>

            {payroll.warnings?.length >
            0 ? (
              payroll.warnings.map(
                (
                  warning,
                  index,
                ) => (
                  <div
                    key={index}
                    className="text-red-600 text-sm"
                  >
                    ⚠ {warning}
                  </div>
                ),
              )
            ) : (
              <div className="text-green-600 text-sm">
                No payroll issues detected.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollDetailModal;