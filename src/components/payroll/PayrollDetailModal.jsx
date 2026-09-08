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
          payrollType: payroll.employee?.payroll_type,
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
            payrollType: payroll.employee?.payroll_type,
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
            payrollType: payroll.employee?.payroll_type,
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
        payrollType: payroll.employee?.payroll_type,
      });

      totals.rendered += result.renderedHours || 0;
      totals.regular += result.regularHours || 0;

      totals.tardiness += result.tardinessMinutes || 0;
      totals.undertime += result.undertimeMinutes || 0;

      // Half-day absence is half of THAT day's scheduled hours, not a
      // fixed 4 hours - a 6-hour-shift employee's half day is 3 hours.
      const halfDayHours = (result.expectedHours || 0) / 2;

      if (result.firstHalfAbsent) {
        totals.firstHalfAbsentHours += halfDayHours;
      }

      if (result.secondHalfAbsent) {
        totals.secondHalfAbsentHours += halfDayHours;
      }

      totals.total +=
        (result.tardinessMinutes || 0) + (result.undertimeMinutes || 0);

      return totals;
    },
    {
      rendered: 0,
      regular: 0,

      tardiness: 0,
      undertime: 0,

      firstHalfAbsentHours: 0,
      secondHalfAbsentHours: 0,

      total: 0,
    },
  );

  // Computed once here and reused by both the mobile card list and the
  // desktop table below, instead of recalculating per record in each.
  const recordRows =
    payroll.records?.map((record) => {
      let workedHours = 0;
      let regularHours = 0;
      let otHours = 0;

      let result = {
        renderedHours: 0,
        regularHours: 0,

        tardinessMinutes: 0,
        tardinessHours: 0,

        undertimeMinutes: 0,
        undertimeHours: 0,

        overtimeHours: 0,
      };

      if (record.check_in_time_raw && record.check_out_time_raw) {
        result = calculateAttendanceHours({
          checkIn: new Date(record.check_in_time_raw),
          checkOut: new Date(record.check_out_time_raw),
          schedule: payroll.employee?.schedule_template,
          attendanceDate: record.attendance_date,
          payrollType: payroll.employee?.payroll_type,
        });

        workedHours = result.renderedHours;
        regularHours = result.regularHours;
        otHours = result.overtimeHours;
      }

      const hasAttendanceWarning =
        (result.undertimeHours || 0) > 0 || (result.tardinessHours || 0) > 0;

      return {
        record,
        result,
        workedHours,
        regularHours,
        otHours,
        hasAttendanceWarning,
      };
    }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border p-5">
          <div>
            <h2 className="text-xl font-bold">Payroll Details</h2>

            <p className="text-sm text-fg-subtle">
              {payroll.employee.first_name} {payroll.employee.last_name}
            </p>
          </div>

          <button onClick={onClose} className="text-fg-subtle hover:text-fg">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Payroll Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-fg-subtle">Payroll Type</p>

              <p className="font-semibold">{payroll.payrollType}</p>
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-fg-subtle">Cutoff</p>

              <p className="font-semibold">{activePeriod.cutoffStart}</p>

              <p className="font-semibold">{activePeriod.cutoffEnd}</p>
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-fg-subtle">Payout Date</p>

              <p className="font-semibold">{activePeriod.payoutDate}</p>
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-fg-subtle">Daily Rate</p>

              <p className="font-semibold">
                ₱{Number(payroll.dailyRate).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Summary */}
          {isTripBasedEmployee ? (
            <div>
              <h3 className="font-semibold mb-3">Trip Payroll Summary</h3>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="border border-border rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-fg-subtle">Total Trips</p>
                  <p className="font-bold text-base sm:text-xl">
                    {payroll.totalTrips}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-fg-subtle">Trip Pay</p>
                  <p className="font-bold text-base sm:text-xl text-green-700">
                    ₱{Number(payroll.tripPay || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-fg-subtle">Gross Payroll</p>
                  <p className="font-bold text-base sm:text-xl text-green-700">
                    ₱{Number(payroll.grossPay || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold mb-3">Payroll Summary</h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">Days Worked</p>

                  <p className="font-bold">{payroll.daysWorked}</p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">Hours Rendered</p>

                  <p className="font-bold">
                    {Number(payroll.renderedHours || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">Regular Hours</p>

                  <p className="font-bold">
                    {Number(payroll.regularHours || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">Undertime</p>

                  <p className="font-bold text-red-600">
                    {payroll.undertimeHours?.toFixed(2)}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">UT Deduction</p>

                  <p className="font-bold text-red-600">
                    ₱{payroll.undertimeDeduction?.toFixed(2)}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">OT Hours</p>

                  <p className="font-bold">
                    {Number(payroll.otHours || 0).toFixed(2)}
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">Basic Pay</p>

                  <p className="font-bold">₱{payroll.basicPay.toFixed(2)}</p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-fg-subtle">OT Pay</p>

                  <p className="font-bold">₱{payroll.otPay.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Gross */}
          <div className="border border-success/30 rounded-xl p-5 bg-success/10">
            <p className="text-sm text-fg-subtle">Gross Payroll</p>

            <p className="text-3xl font-bold text-green-700">
              ₱{payroll.grossPay.toFixed(2)}
            </p>
          </div>

          {/* Validation */}
          {isTripBasedEmployee ? (
            <div>
              <h3 className="font-semibold mb-3">Trip Breakdown</h3>

              {/* MOBILE: card list */}
              <div className="space-y-2 md:hidden">
                {payroll.tripBreakdown?.map((trip, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border border-border p-3 ${
                      trip.isFirstTrip ? "" : "bg-warning/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-fg-subtle">{trip.date}</p>
                        <p className="font-semibold">
                          #{trip.tripSequence} · {trip.ticket_no}
                        </p>
                      </div>

                      {trip.isFirstTrip ? (
                        <span className="shrink-0 px-2 py-1 rounded bg-success/15 text-success text-xs font-semibold">
                          First Trip
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-1 rounded bg-warning/15 text-warning text-xs font-semibold">
                          Succeeding Trip
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-fg-subtle">Vehicle</span>
                        <p>{trip.vehicle_unit}</p>
                      </div>

                      <div>
                        <span className="text-xs text-fg-subtle">Plate #</span>
                        <p>{trip.plate_number}</p>
                      </div>

                      <div className="col-span-2">
                        <span className="text-xs text-fg-subtle">
                          Rate Profile
                        </span>
                        <p>{trip.trip_rate_profile}</p>
                      </div>
                    </div>

                    <div className="mt-2 border-t border-border pt-2 text-right font-semibold">
                      ₱{Number(trip.rate || 0).toFixed(2)}
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border border-border bg-surface-hover p-3 flex items-center justify-between font-bold">
                  <span>Total Payroll</span>
                  <span className="text-green-700">
                    ₱{Number(payroll.tripPay || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* DESKTOP: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border border-border">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="border border-border px-3 py-2">Date</th>
                      <th className="border border-border px-3 py-2">Trip #</th>
                      <th className="border border-border px-3 py-2">Ticket No</th>
                      <th className="border border-border px-3 py-2">Vehicle</th>
                      <th className="border border-border px-3 py-2">Plate Number</th>
                      <th className="border border-border px-3 py-2">Rate Profile</th>
                      <th className="border border-border px-3 py-2">Trip Sequence</th>
                      <th className="border border-border px-3 py-2">Rate</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payroll.tripBreakdown?.map((trip, index) => (
                      <tr
                        key={index}
                        className={trip.isFirstTrip ? "" : "bg-warning/10"}
                      >
                        <td className="border border-border px-3 py-2">{trip.date}</td>

                        <td className="border border-border px-3 py-2 text-center font-semibold">
                          #{trip.tripSequence}
                        </td>

                        <td className="border border-border px-3 py-2">{trip.ticket_no}</td>

                        <td className="border border-border px-3 py-2">
                          {trip.vehicle_unit}
                        </td>

                        <td className="border border-border px-3 py-2">
                          {trip.plate_number}
                        </td>

                        <td className="border border-border px-3 py-2">
                          {trip.trip_rate_profile}
                        </td>

                        <td className="border border-border px-3 py-2">
                          {trip.isFirstTrip ? (
                            <span className="px-2 py-1 rounded bg-success/15 text-success text-xs font-semibold">
                              First Trip
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-warning/15 text-warning text-xs font-semibold">
                              Succeeding Trip
                            </span>
                          )}
                        </td>

                        <td className="border border-border px-3 py-2 font-semibold">
                          ₱{Number(trip.rate || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={7} className="border border-border px-3 py-2 font-bold">
                        Total Payroll
                      </td>

                      <td className="border border-border px-3 py-2 font-bold text-green-700">
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

              {/* MOBILE: card list */}
              <div className="space-y-2 md:hidden">
                {recordRows.map(
                  ({ record, result, workedHours, regularHours, otHours, hasAttendanceWarning }) => (
                    <div
                      key={record.id}
                      className={`rounded-lg border border-border p-3 ${
                        hasAttendanceWarning ? "bg-warning/10" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {record.attendance_date}
                          </p>
                          <p className="text-xs text-fg-subtle">
                            {new Date(
                              record.attendance_date + "T00:00:00",
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                            })}
                          </p>
                          <p className="text-xs text-fg-subtle">
                            Schedule:{" "}
                            <span className="font-semibold">
                              {result.scheduledTimeIn || "--"} -{" "}
                              {result.scheduledTimeOut || "--"}
                            </span>
                          </p>
                        </div>

                        <span className="shrink-0 text-xs text-fg-subtle">
                          {record.status}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-fg-subtle">
                            Time In
                          </span>
                          <p>
                            {["On Leave", "Absent"].includes(record.status)
                              ? "--"
                              : record.check_in_time || "--"}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-fg-subtle">
                            Time Out
                          </span>
                          <p>
                            {["On Leave", "Absent"].includes(record.status)
                              ? "--"
                              : record.check_out_time || "--"}
                          </p>
                        </div>
                      </div>

                      {(result.firstHalfAbsent || result.secondHalfAbsent) && (
                        <p className="mt-2 font-semibold text-orange-600 text-sm">
                          {result.firstHalfAbsent
                            ? "1st Half Absent"
                            : "2nd Half Absent"}
                        </p>
                      )}

                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-fg-subtle">
                            Hours Rendered
                          </span>
                          <p>{Number(workedHours || 0).toFixed(2)}</p>
                        </div>

                        <div>
                          <span className="text-xs text-fg-subtle">
                            Regular Hours
                          </span>
                          <p>{Number(regularHours || 0).toFixed(2)}</p>
                        </div>

                        <div>
                          <span className="text-xs text-fg-subtle">OT</span>
                          <p>{Number(otHours || 0).toFixed(2)}</p>
                        </div>
                      </div>

                      {otHours > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-fg-subtle">
                            Approved OT
                          </span>
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
                            className="mt-1 w-full border border-border rounded px-2 py-1 bg-surface text-fg"
                          />
                        </div>
                      )}

                      {(result.tardinessMinutes > 0 ||
                        result.undertimeMinutes > 0) && (
                        <div className="mt-2 border-t border-border pt-2 grid grid-cols-2 gap-2 text-sm text-red-600">
                          {result.tardinessMinutes > 0 && (
                            <div>
                              <span className="text-xs text-red-400">
                                Tardiness
                              </span>
                              <p>
                                {result.tardinessMinutes} mins (
                                {result.tardinessHours.toFixed(2)} hr)
                              </p>
                            </div>
                          )}

                          {result.undertimeMinutes > 0 && (
                            <div>
                              <span className="text-xs text-red-400">UT</span>
                              <p>
                                {result.undertimeMinutes} mins (
                                {result.undertimeHours.toFixed(2)} hr)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )}

                {/* Totals summary card */}
                <div className="rounded-lg border border-border bg-surface-hover p-3 space-y-1 text-sm font-semibold">
                  <p>Totals</p>

                  {(tableTotals.firstHalfAbsentHours > 0 ||
                    tableTotals.secondHalfAbsentHours > 0) && (
                    <div className="text-orange-600">
                      {tableTotals.firstHalfAbsentHours > 0 && (
                        <div>
                          1st Half: {tableTotals.firstHalfAbsentHours.toFixed(2)}{" "}
                          hrs
                        </div>
                      )}

                      {tableTotals.secondHalfAbsentHours > 0 && (
                        <div>
                          2nd Half:{" "}
                          {tableTotals.secondHalfAbsentHours.toFixed(2)} hrs
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 font-normal">
                    <span>
                      Hours Rendered: {Number(tableTotals.rendered || 0).toFixed(2)}
                    </span>
                    <span>
                      Regular Hours: {Number(tableTotals.regular || 0).toFixed(2)}
                    </span>
                    <span>
                      OT: {Number(payroll.otHours || 0).toFixed(2)}
                    </span>
                    <span>Approved OT: {approvedTotalValue.toFixed(2)}</span>
                  </div>

                  {(tableTotals.tardiness > 0 || tableTotals.undertime > 0) && (
                    <div className="text-red-600 font-normal">
                      {tableTotals.tardiness > 0 && (
                        <div>
                          Tardiness: {tableTotals.tardiness} mins (
                          {(tableTotals.tardiness / 60).toFixed(2)} hr)
                        </div>
                      )}

                      {tableTotals.undertime > 0 && (
                        <div>
                          UT: {tableTotals.undertime} mins (
                          {(tableTotals.undertime / 60).toFixed(2)} hr)
                        </div>
                      )}

                      {tableTotals.total > 0 && (
                        <div className="font-bold">
                          Total: {tableTotals.total} mins (
                          {(tableTotals.total / 60).toFixed(2)} hr)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* DESKTOP: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border border-border">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="border border-border px-3 py-2 text-center">Date</th>

                      <th className="border border-border px-3 py-2 text-center">Time In</th>

                      <th className="border border-border px-3 py-2 text-center">Time Out</th>

                      <th className="border border-border px-3 py-2 text-center">Status</th>

                      <th className="border border-border px-3 py-2 text-center">
                        Half Day
                      </th>

                      <th className="border border-border px-3 py-2 text-center">
                        Hours Rendered
                      </th>

                      <th className="border border-border px-3 py-2 text-center">
                        Regular Hours
                      </th>

                      <th className="border border-border px-3 py-2 text-center">OT</th>
                      <th className="border border-border px-3 py-2 text-center">
                        Approved OT
                      </th>
                      <th className="border border-border px-3 py-2 text-center">
                        Tardiness
                      </th>
                      <th className="border border-border px-3 py-2 text-center">UT</th>
                      <th className="border border-border px-3 py-2 text-center">Total</th>
                      {/* <th className="border border-border px-3 py-2 text-left">
                          Trips
                      </th> */}
                    </tr>
                  </thead>

                  <tbody>
                    {recordRows.map(
                      ({
                        record,
                        result,
                        workedHours,
                        regularHours,
                        otHours,
                        hasAttendanceWarning,
                      }) => (
                        <tr
                          key={record.id}
                          className={hasAttendanceWarning ? "bg-warning/10" : ""}
                        >
                          <td className="border border-border px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <span>{record.attendance_date}</span>

                              <span className="text-xs text-fg-subtle">
                                {new Date(
                                  record.attendance_date + "T00:00:00",
                                ).toLocaleDateString("en-US", {
                                  weekday: "long",
                                })}
                              </span>

                              <span className="text-xs text-fg-subtle">
                                Schedule:
                                <p className="font-semibold inline-block ml-1">
                                  {result.scheduledTimeIn || "--"} -{" "}
                                  {result.scheduledTimeOut || "--"}
                                </p>
                              </span>
                            </div>
                          </td>

                          <td className="border border-border px-3 py-2">
                            {["On Leave", "Absent"].includes(record.status)
                              ? "--"
                              : record.check_in_time || "--"}
                          </td>

                          <td className="border border-border px-3 py-2">
                            {["On Leave", "Absent"].includes(record.status)
                              ? "--"
                              : record.check_out_time || "--"}
                          </td>

                          <td className="border border-border px-3 py-2">{record.status}</td>

                          <td className="border border-border px-3 py-2 text-center">
                            {result.firstHalfAbsent ? (
                              <span className="font-semibold text-orange-600">
                                1st Half Absent
                              </span>
                            ) : result.secondHalfAbsent ? (
                              <span className="font-semibold text-orange-600">
                                2nd Half Absent
                              </span>
                            ) : (
                              <span className="text-fg-subtle">--</span>
                            )}
                          </td>

                          <td className="border border-border px-3 py-2 text-center">
                            {Number(workedHours || 0).toFixed(2)}
                          </td>

                          <td className="border border-border px-3 py-2 text-center">
                            {Number(regularHours || 0).toFixed(2)}
                          </td>

                          <td className="border border-border px-3 py-2 text-center">
                            {Number(otHours || 0).toFixed(2)}
                          </td>
                          <td className="border border-border px-3 py-2 text-center">
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
                                className="w-20 border border-border rounded px-2 py-1 text-center bg-surface text-fg"
                              />
                            ) : (
                              "--"
                            )}
                          </td>

                          <td className="border border-border px-3 py-2 text-red-600">
                            {result.tardinessMinutes > 0
                              ? `${result.tardinessMinutes} mins (${result.tardinessHours.toFixed(2)} hr)`
                              : "--"}
                          </td>

                          <td className="border border-border px-3 py-2 text-red-600">
                            {result.undertimeMinutes > 0
                              ? `${result.undertimeMinutes} mins (${result.undertimeHours.toFixed(2)} hr)`
                              : "--"}
                          </td>

                          <td className="border border-border px-3 py-2 font-bold text-red-700">
                            {result.tardinessMinutes + result.undertimeMinutes >
                            0
                              ? `${result.tardinessMinutes + result.undertimeMinutes} mins (${((result.tardinessMinutes + result.undertimeMinutes) / 60).toFixed(2)} hr)`
                              : "--"}
                          </td>
                          {/* <td className="border border-border px-3 py-2">
                                  {record.completed_trips}
                              </td> */}
                        </tr>
                      ),
                    )}
                  </tbody>
                  <tfoot className="bg-surface-hover font-semibold">
                    <tr>
                      <td colSpan={4} className="border border-border px-3 py-2">
                        Totals
                      </td>

                      {/* Half-Day Absence Hours */}
                      <td className="border border-border px-3 py-2 text-center">
                        {tableTotals.firstHalfAbsentHours > 0 ||
                        tableTotals.secondHalfAbsentHours > 0 ? (
                          <div className="text-sm">
                            {tableTotals.firstHalfAbsentHours > 0 && (
                              <div>
                                1st Half:{" "}
                                {tableTotals.firstHalfAbsentHours.toFixed(2)} hrs
                              </div>
                            )}

                            {tableTotals.secondHalfAbsentHours > 0 && (
                              <div>
                                2nd Half:{" "}
                                {tableTotals.secondHalfAbsentHours.toFixed(2)} hrs
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-fg-subtle">--</span>
                        )}
                      </td>

                      {/* Hours Rendered */}
                      <td className="border border-border px-3 py-2">
                        {Number(tableTotals.rendered || 0).toFixed(2)}
                      </td>

                      {/* Regular Hours */}
                      <td className="border border-border px-3 py-2">
                        {Number(tableTotals.regular || 0).toFixed(2)}
                      </td>

                      {/* OT */}
                      <td className="border border-border px-3 py-2">
                        {Number(payroll.otHours || 0).toFixed(2)}
                      </td>

                      {/* Approved OT */}
                      <td className="border border-border px-3 py-2">
                        {approvedTotalValue.toFixed(2)}
                      </td>

                      {/* Deduction */}
                      <td className="border border-border px-3 py-2">
                        {tableTotals.tardiness > 0
                          ? `${tableTotals.tardiness} mins (${(tableTotals.tardiness / 60).toFixed(2)} hr)`
                          : "--"}
                      </td>

                      <td className="border border-border px-3 py-2">
                        {tableTotals.undertime > 0
                          ? `${tableTotals.undertime} mins (${(tableTotals.undertime / 60).toFixed(2)} hr)`
                          : "--"}
                      </td>

                      <td className="border border-border px-3 py-2 font-bold">
                        {tableTotals.total > 0
                          ? `${tableTotals.total} mins (${(tableTotals.total / 60).toFixed(2)} hr)`
                          : "--"}
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
        <div className="border-t border-border p-4 flex justify-end gap-2">
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
            className="px-4 py-2 rounded-lg bg-surface-hover hover:bg-surface-active"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollDetailModal;
