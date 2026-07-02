import React, { useState, useEffect } from "react";
import {
  approveOT,
  getEmployeeOTHistory,
} from "../../api/payroll/overtimeApproval";
import { calculateAttendanceHours } from "../../utils/payroll/calculateAttendanceHours";
import toast from "react-hot-toast";

const PayrollDetailModal = ({
  isOpen,
  onClose,
  payroll,
  activePeriod,
  onOTApproved,
}) => {
  const [approvedOT, setApprovedOT] = useState({});
  useEffect(() => {
    const loadApproval = async () => {
      if (!payroll?.employee?.id) return;

      try {
        const history = await getEmployeeOTHistory(payroll.employee.id);

        const approval = history.find(
          (item) =>
            item.cutoff_start === activePeriod.cutoffStart &&
            item.cutoff_end === activePeriod.cutoffEnd,
        );

        if (!approval) return;

        // setSavedApproval(
        //   approval
        // );

        const mapped = {};

        approval.details.forEach((detail) => {
          mapped[detail.attendance_id] = detail.approved_ot_hours;
        });

        setApprovedOT(mapped);
      } catch (err) {
        console.error(err);
      }
    };

    if (isOpen && payroll) {
      loadApproval();
    }
  }, [isOpen, payroll, activePeriod]);
  const approvedTotalValue =
    payroll?.records?.reduce((sum, record) => {
      let otHours = 0;

      if (record.check_in_time_raw && record.check_out_time_raw) {
        const checkIn = new Date(record.check_in_time_raw);

        const checkOut = new Date(record.check_out_time_raw);

        const result = calculateAttendanceHours({
          checkIn,
          checkOut,
          schedule: payroll.employee?.schedule_template,
          attendanceDate: record.attendance_date,
        });

        otHours = result.overtimeHours;
      }

      return sum + (approvedOT[record.id] ?? otHours);
    }, 0) || 0;
  const handleSaveOTApproval = async () => {
    try {
      const approvedTotal = payroll.records.reduce((sum, record) => {
        let otHours = 0;

        if (record.check_in_time_raw && record.check_out_time_raw) {
          const checkIn = new Date(record.check_in_time_raw);

          const checkOut = new Date(record.check_out_time_raw);

          const result = calculateAttendanceHours({
            checkIn,
            checkOut,
            schedule: payroll.employee?.schedule_template,
            attendanceDate: record.attendance_date,
          });

          otHours = result.overtimeHours;
        }

        return sum + (approvedOT[record.id] ?? otHours);
      }, 0);

      const details = payroll.records
        .filter(
          (record) => record.check_in_time_raw && record.check_out_time_raw,
        )
        .map((record) => {
          const checkIn = new Date(record.check_in_time_raw);

          const checkOut = new Date(record.check_out_time_raw);

          // let workedHours =
          //   (checkOut - checkIn) /
          //   1000 /
          //   60 /
          //   60;

          // workedHours -= 1;

          // workedHours = Math.max(
          //   workedHours,
          //   0
          // );

          // const detectedOT =
          //   Math.max(
          //     workedHours - 8,
          //     0
          //   );
          const result = calculateAttendanceHours({
            checkIn,
            checkOut,
            schedule: payroll.employee?.schedule_template,
            attendanceDate: record.attendance_date,
          });

          const detectedOT = result.overtimeHours;

          return {
            attendance_id: record.id,

            detected_ot_hours: detectedOT,

            approved_ot_hours: approvedOT[record.id] ?? detectedOT,
          };
        });

      await approveOT({
        employee_id: payroll.employee.id,

        cutoff_start: activePeriod.cutoffStart,

        cutoff_end: activePeriod.cutoffEnd,

        detected_ot_hours: payroll.otHours,

        approved_ot_hours: approvedTotal,

        remarks: "Approved via Payroll Detail Modal",

        details,
      });

      toast.success("OT approved successfully");

      await onOTApproved?.();

      onClose();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.detail || "Failed to approve overtime");
    }
  };
  if (!isOpen || !payroll) return null;

  const isTripBasedEmployee = payroll?.isTripBasedEmployee === true;

  const tableTotals = payroll.records.reduce(
    (totals, record) => {
      if (!record.check_in_time_raw || !record.check_out_time_raw) {
        return totals;
      }

      const result = calculateAttendanceHours({
        checkIn: new Date(record.check_in_time_raw),
        checkOut: new Date(record.check_out_time_raw),
        schedule: payroll.employee?.schedule_template,
        attendanceDate: record.attendance_date,
      });

      totals.rendered += result.renderedHours || 0;
      totals.regular += result.regularHours || 0;

      return totals;
    },
    {
      rendered: 0,
      regular: 0,
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-5">
          <div>
            <h2 className="text-xl font-bold">Payroll Details</h2>

            <p className="text-sm text-gray-500">
              {payroll.employee.first_name} {payroll.employee.last_name}
            </p>
          </div>

          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Payroll Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">Payroll Type</p>

              <p className="font-semibold">{payroll.payrollType}</p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">Cutoff</p>

              <p className="font-semibold">{activePeriod.cutoffStart}</p>

              <p className="font-semibold">{activePeriod.cutoffEnd}</p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">Payout Date</p>

              <p className="font-semibold">{activePeriod.payoutDate}</p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-gray-500">Daily Rate</p>

              <p className="font-semibold">
                ₱{Number(payroll.dailyRate).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Summary */}
          {isTripBasedEmployee ? (
            <div>
              <h3 className="font-semibold mb-3">Trip Payroll Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Trips</p>
                  <p className="font-bold text-xl">{payroll.totalTrips}</p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Trip Pay</p>
                  <p className="font-bold text-xl text-green-700">
                    ₱{Number(payroll.tripPay || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Gross Payroll</p>
                  <p className="font-bold text-xl text-green-700">
                    ₱{Number(payroll.grossPay || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold mb-3">Payroll Summary</h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Days Worked</p>

                  <p className="font-bold">{payroll.daysWorked}</p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Hours Rendered</p>

                  <p className="font-bold">
                    {Number(payroll.renderedHours || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Regular Hours</p>

                  <p className="font-bold">
                    {Number(payroll.regularHours || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Undertime</p>

                  <p className="font-bold text-red-600">
                    {payroll.undertimeHours?.toFixed(2)}
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">UT Deduction</p>

                  <p className="font-bold text-red-600">
                    ₱{payroll.undertimeDeduction?.toFixed(2)}
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">OT Hours</p>

                  <p className="font-bold">{payroll.otHours.toFixed(2)}</p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Basic Pay</p>

                  <p className="font-bold">₱{payroll.basicPay.toFixed(2)}</p>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">OT Pay</p>

                  <p className="font-bold">₱{payroll.otPay.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Gross */}
          <div className="border rounded-xl p-5 bg-green-50">
            <p className="text-sm text-gray-500">Gross Payroll</p>

            <p className="text-3xl font-bold text-green-700">
              ₱{payroll.grossPay.toFixed(2)}
            </p>
          </div>

          {/* Validation */}
          {isTripBasedEmployee ? (
            <div>
              <h3 className="font-semibold mb-3">Trip Breakdown</h3>

              <div className="overflow-x-auto">
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2">Date</th>
                      <th className="border px-3 py-2">Trip #</th>
                      <th className="border px-3 py-2">Ticket No</th>
                      <th className="border px-3 py-2">Vehicle</th>
                      <th className="border px-3 py-2">Plate Number</th>
                      <th className="border px-3 py-2">Rate Profile</th>
                      <th className="border px-3 py-2">Trip Sequence</th>
                      <th className="border px-3 py-2">Rate</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payroll.tripBreakdown?.map((trip, index) => (
                      <tr
                        key={index}
                        className={trip.isFirstTrip ? "" : "bg-yellow-50"}
                      >
                        <td className="border px-3 py-2">{trip.date}</td>

                        <td className="border px-3 py-2 text-center font-semibold">
                          #{trip.tripSequence}
                        </td>

                        <td className="border px-3 py-2">{trip.ticket_no}</td>

                        <td className="border px-3 py-2">
                          {trip.vehicle_unit}
                        </td>

                        <td className="border px-3 py-2">
                          {trip.plate_number}
                        </td>

                        <td className="border px-3 py-2">
                          {trip.trip_rate_profile}
                        </td>

                        <td className="border px-3 py-2">
                          {trip.isFirstTrip ? (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">
                              First Trip
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">
                              Succeeding Trip
                            </span>
                          )}
                        </td>

                        <td className="border px-3 py-2 font-semibold">
                          ₱{Number(trip.rate || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={7} className="border px-3 py-2 font-bold">
                        Total Payroll
                      </td>

                      <td className="border px-3 py-2 font-bold text-green-700">
                        ₱{Number(payroll.tripPay || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold mb-3">Attendance Breakdown</h3>

              <div className="overflow-x-auto">
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left">Date</th>

                      <th className="border px-3 py-2 text-left">Time In</th>

                      <th className="border px-3 py-2 text-left">Time Out</th>

                      <th className="border px-3 py-2 text-left">Status</th>

                      <th className="border px-3 py-2 text-left">
                        Hours Rendered
                      </th>

                      <th className="border px-3 py-2 text-left">
                        Regular Hours
                      </th>

                      <th className="border px-3 py-2 text-left">OT</th>
                      <th className="border px-3 py-2 text-left">
                        Approved OT
                      </th>
                      <th className="border px-3 py-2 text-left">UT</th>
                      {/* <th className="border px-3 py-2 text-left">
                          Trips
                      </th> */}
                    </tr>
                  </thead>

                  <tbody>
                    {payroll.records?.map((record) => {
                      let workedHours = 0;
                      let regularHours = 0;
                      let otHours = 0;
                      let result = {
                        renderedHours: 0,
                        regularHours: 0,
                        undertimeHours: 0,
                        overtimeHours: 0,
                      };

                      if (
                        record.check_in_time_raw &&
                        record.check_out_time_raw
                      ) {
                        result = calculateAttendanceHours({
                          checkIn: new Date(record.check_in_time_raw),
                          checkOut: new Date(record.check_out_time_raw),
                          schedule: payroll.employee?.schedule_template,
                          attendanceDate: record.attendance_date,
                        });

                        workedHours = result.renderedHours;

                        regularHours = result.regularHours;

                        otHours = result.overtimeHours;
                      }

                      const hasUndertime = (result.undertimeHours || 0) > 0;

                      return (
                        <tr
                          key={record.id}
                          className={hasUndertime ? "bg-yellow-50" : ""}
                        >
                          <td className="border px-3 py-2">
                            {record.attendance_date}
                          </td>

                          <td className="border px-3 py-2">
                            {["On Leave", "Absent"].includes(record.status)
                              ? "--"
                              : record.check_in_time || "--"}
                          </td>

                          <td className="border px-3 py-2">
                            {["On Leave", "Absent"].includes(record.status)
                              ? "--"
                              : record.check_out_time || "--"}
                          </td>

                          <td className="border px-3 py-2">{record.status}</td>

                          <td className="border px-3 py-2">
                            {Number(workedHours || 0).toFixed(2)}
                          </td>

                          <td className="border px-3 py-2">
                            {Number(regularHours || 0).toFixed(2)}
                          </td>

                          <td className="border px-3 py-2">
                            {Number(otHours || 0).toFixed(2)}
                          </td>
                          <td className="border px-3 py-2">
                            {otHours > 0 ? (
                              <input
                                type="number"
                                min="0"
                                max={otHours}
                                step="0.25"
                                value={approvedOT[record.id] ?? otHours}
                                onChange={(e) => {
                                  let value = Number(e.target.value);

                                  if (value < 0) {
                                    value = 0;
                                  }

                                  if (value > otHours) {
                                    value = otHours;
                                  }

                                  setApprovedOT((prev) => ({
                                    ...prev,
                                    [record.id]: value,
                                  }));
                                }}
                                className="w-20 border rounded px-2 py-1 text-center"
                              />
                            ) : (
                              "--"
                            )}
                          </td>

                          <td
                            className={`border px-3 py-2 ${
                              result.undertimeHours > 0
                                ? "text-red-600 font-bold"
                                : ""
                            }`}
                          >
                            {Number(result.undertimeHours || 0).toFixed(2)}
                          </td>
                          {/* <td className="border px-3 py-2">
                                  {record.completed_trips}
                              </td> */}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 font-semibold">
                    <tr>
                      <td colSpan={4} className="border px-3 py-2">
                        Totals
                      </td>

                      {/* Hours Rendered */}
                      <td className="border px-3 py-2">
                        {tableTotals.toFixed(2)}
                      </td>

                      {/* Regular Hours */}
                      <td className="border px-3 py-2">
                        {tableTotals.toFixed(2)}
                      </td>

                      {/* OT */}
                      <td className="border px-3 py-2">
                        {payroll.otHours.toFixed(2)}
                      </td>

                      {/* Approved OT */}
                      <td className="border px-3 py-2">
                        {approvedTotalValue.toFixed(2)}
                      </td>

                      {/* UT */}
                      <td className="border px-3 py-2">
                        {payroll.undertimeHours.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-2">Validation</h3>

            {payroll.warnings?.length > 0 ? (
              payroll.warnings.map((warning, index) => (
                <div key={index} className="text-red-600 text-sm">
                  ⚠ {warning}
                </div>
              ))
            ) : (
              <div className="text-green-600 text-sm">
                No payroll issues detected.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-2">
          {!isTripBasedEmployee && (
            <button
              onClick={handleSaveOTApproval}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Save OT Approval
            </button>
          )}
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
