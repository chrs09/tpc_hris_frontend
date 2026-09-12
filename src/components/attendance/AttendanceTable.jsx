import React from "react";
import { format, getDay, parseISO, isValid } from "date-fns";

const formatTime = (value) => {
  if (!value) return "--";

  const parsed = typeof value === "string" ? parseISO(value) : new Date(value);

  if (!isValid(parsed)) return value;

  return format(parsed, "hh:mm a");
};

const NEEDS_REVIEW_STATUSES = [
  "NEEDS_REVIEW",
  "NO_PROFILE_PHOTO",
  "FACE_MATCH_FAILED",
];

const AttendanceTable = ({
  employees,
  daysInMonth,
  attendanceMap,
  holidayMap = {},
  departmentColors,
  statusColors,
  getStatusSymbol,
  isEditableDate,
  isSuperAdmin,
  onCellClick,
  onPreviewAttendance,
  today,
}) => {
  return (
    <div className="overflow-x-auto border-border border rounded shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-30 bg-surface border-border border px-4 py-2">
              Employee
            </th>

            {daysInMonth.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const isToday = dateKey === today;
              const isSunday = getDay(day) === 0;
              const holiday = holidayMap[dateKey];

              let headerBg = "bg-surface text-fg";

              if (isToday) {
                headerBg = "bg-primary text-primary-foreground";
              } else if (holiday) {
                headerBg = "bg-danger/15 text-fg";
              } else if (isSunday) {
                headerBg = "bg-warning/20 text-fg";
              }

              return (
                <th
                  key={dateKey}
                  title={holiday ? holiday.holiday_name : undefined}
                  className={`border-border border px-2 py-1 text-center ${headerBg}`}
                >
                  {format(day, "dd")}
                  {holiday && (
                    <div className="text-[9px] leading-tight text-danger font-normal whitespace-normal wrap-break-word mt-0.5">
                      ★ {holiday.holiday_name}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td
                className={`sticky left-0 z-20 border-border border px-4 py-2 font-medium capitalize ${
                  departmentColors[emp.role] || "bg-surface"
                }`}
              >
                {emp.name}
              </td>

              {daysInMonth.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const attendance = attendanceMap[`${emp.id}-${dateKey}`];
                const holiday = holidayMap[dateKey];

                const status = attendance?.status;
                const completedTrips = attendance?.completed_trips || 0;

                const isTripBasedEmployee =
                  emp.role?.toLowerCase().includes("driver") ||
                  emp.role?.toLowerCase().includes("helper");

                const editable =
                  isSuperAdmin && isEditableDate(day) && !isTripBasedEmployee;

                const isSunday = getDay(day) === 0;

                const hasTimeIn = !!attendance?.check_in_time;
                const hasTimeOut = !!attendance?.check_out_time;

                const isUndertime = (() => {
                  if (
                    !attendance?.check_in_time_raw ||
                    !attendance?.check_out_time_raw
                  ) {
                    return false;
                  }

                  const timeIn = new Date(attendance.check_in_time_raw);
                  const timeOut = new Date(attendance.check_out_time_raw);

                  const hoursWorked = (timeOut - timeIn) / (1000 * 60 * 60);

                  return hoursWorked < 8;
                })();

                const tripTickets = attendance?.trip_tickets || [];

                const tripTooltip =
                  tripTickets.length > 0
                    ? tripTickets
                        .map((trip) =>
                          [
                            `Ticket: ${trip.ticket_no}`,
                            `Vehicle: ${trip.vehicle_unit || "N/A"}`,
                            `Profile: ${trip.trip_rate_profile || "N/A"}`,
                          ].join("\n"),
                        )
                        .join("\n\n")
                    : "";

                const hasTimeInPreview =
                  !!attendance?.time_in_photo_url ||
                  (!!attendance?.time_in_latitude &&
                    !!attendance?.time_in_longitude);

                const hasTimeOutPreview =
                  !!attendance?.time_out_photo_url ||
                  (!!attendance?.time_out_latitude &&
                    !!attendance?.time_out_longitude);

                const tooltipText =
                  status === "On Leave" || status === "Absent"
                    ? attendance?.remarks || ""
                    : "";

                let bg = "bg-surface";
                // Status pill backgrounds (statusColors) are fixed light
                // pastels designed to read as a self-contained "sticker" --
                // they need a fixed dark text color paired with them so
                // they stay legible even when the surrounding page text
                // flips to light in dark mode (see statusTextClass below).
                let hasStatusPastel = false;

                if (status) {
                  bg = statusColors[status];
                  hasStatusPastel = true;
                }

                // "On Leave"/"Absent" must win over the trip-based-employee
                // treatment below -- a driver or helper who is on leave is
                // not "no trips today", so their status still needs to show,
                // not get silently replaced by a blank trip-count tile.
                const isLeaveOrAbsent = ["On Leave", "Absent"].includes(status);

                // Face recognition flagged this check-in for a superadmin
                // to confirm (see AttendanceGridReview's Approve/Reject) --
                // until that happens it must not read as a plain, settled
                // "Present" cell.
                const needsFaceReview =
                  !!attendance &&
                  NEEDS_REVIEW_STATUSES.includes(attendance.face_review_status);

                if (isLeaveOrAbsent) {
                  bg = statusColors[status];
                  hasStatusPastel = true;
                } else if (needsFaceReview) {
                  bg = "bg-amber-100";
                  hasStatusPastel = true;
                } else if (status === "Present" && isUndertime) {
                  bg = statusColors["Halfday"];
                  hasStatusPastel = true;
                } else if (holiday) {
                  bg = "bg-danger/10";
                  hasStatusPastel = false;
                } else if (isSunday) {
                  bg = "bg-warning/15";
                  hasStatusPastel = false;
                } else if (isTripBasedEmployee) {
                  bg = "bg-surface-hover";
                  hasStatusPastel = false;
                }

                const statusTextClass = hasStatusPastel ? "text-gray-800" : "";

                return (
                  <td
                    key={dateKey}
                    title={
                      holiday
                        ? holiday.holiday_name
                        : needsFaceReview
                          ? "Needs Review: awaiting superadmin confirmation in Review View"
                          : isLeaveOrAbsent
                            ? tooltipText
                            : isTripBasedEmployee
                              ? tripTooltip
                              : tooltipText
                    }
                    className={`border-border border text-center font-bold min-w-17.5 ${bg} ${statusTextClass} ${
                      editable
                        ? "cursor-pointer hover:brightness-95"
                        : "opacity-80"
                    }`}
                    onClick={() => {
                      if (!editable) return;
                      onCellClick(emp, dateKey, status, attendance);
                    }}
                  >
                    {status ? (
                      <>
                        {isLeaveOrAbsent ? (
                          <div className="flex items-center justify-center px-1 py-1">
                            <span className="text-[10px] leading-tight font-semibold whitespace-normal wrap-break-word">
                              {attendance?.remarks || getStatusSymbol(status)}
                            </span>
                          </div>
                        ) : needsFaceReview ? (
                          <div className="flex items-center justify-center px-1 py-2">
                            <span className="text-[10px] leading-tight font-bold uppercase text-amber-700 whitespace-normal wrap-break-word">
                              ⚠ Needs Review
                            </span>
                          </div>
                        ) : isTripBasedEmployee ? (
                          <div className="flex items-center justify-center">
                            <span className="text-base font-extrabold">
                              {completedTrips > 0 ? completedTrips : ""}
                            </span>
                          </div>
                        ) : [
                            "Rest Day",
                            "No Trip",
                            "Halfday",
                            "Delay",
                          ].includes(status) ? (
                          <div className="flex items-center justify-center">
                            <span className="text-base font-extrabold">
                              {getStatusSymbol(status)}
                            </span>
                          </div>
                        ) : hasTimeIn || hasTimeOut ? (
                          <div className="flex flex-col text-[10px] leading-tight">
                            <button
                              type="button"
                              disabled={!hasTimeInPreview}
                              className={`py-1 px-1 rounded ${
                                hasTimeInPreview
                                  ? "hover:bg-black/10 cursor-pointer underline"
                                  : "cursor-default"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();

                                if (!hasTimeInPreview) return;

                                onPreviewAttendance?.(attendance, "timein");
                              }}
                            >
                              IN: {formatTime(attendance.check_in_time)}
                            </button>

                            <button
                              type="button"
                              disabled={!hasTimeOutPreview}
                              className={`border-t py-1 px-1 rounded ${
                                hasTimeOutPreview
                                  ? "hover:bg-black/10 cursor-pointer underline"
                                  : "cursor-default"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();

                                if (!hasTimeOutPreview) return;

                                onPreviewAttendance?.(attendance, "timeout");
                              }}
                            >
                              OUT: {formatTime(attendance.check_out_time)}
                            </button>
                            <button
                              type="button"
                              className="border-t py-1 px-1 text-blue-600 underline hover:bg-black/10"
                              onClick={(e) => {
                                e.stopPropagation();

                                onCellClick(emp, dateKey, status, attendance);
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <span className="text-base font-extrabold">
                              {getStatusSymbol(status)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : editable ? (
                      <div className="flex items-center justify-center h-full">
                        <button
                          type="button"
                          className="text-fg-subtle hover:text-blue-600 text-lg"
                          onClick={(e) => {
                            e.stopPropagation();

                            onCellClick(emp, dateKey, "Present", null);
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      ""
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
