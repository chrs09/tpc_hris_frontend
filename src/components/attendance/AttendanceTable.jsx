import React from "react";
import { format, getDay, parseISO, isValid } from "date-fns";

const formatTime = (value) => {
  if (!value) return "--";

  const parsed = typeof value === "string" ? parseISO(value) : new Date(value);

  if (!isValid(parsed)) return value;

  return format(parsed, "hh:mm a");
};

const AttendanceTable = ({
  employees,
  daysInMonth,
  attendanceMap,
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
    <div className="overflow-x-auto border rounded shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-30 bg-white border px-4 py-2">
              Employee
            </th>

            {daysInMonth.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const isToday = dateKey === today;
              const isSunday = getDay(day) === 0;

              let headerBg = "bg-white";

              if (isToday) {
                headerBg = "bg-blue-500 text-white";
              } else if (isSunday) {
                headerBg = "bg-yellow-300";
              }

              return (
                <th
                  key={dateKey}
                  className={`border px-2 py-1 text-center ${headerBg}`}
                >
                  {format(day, "dd")}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td
                className={`sticky left-0 z-20 border px-4 py-2 font-medium capitalize ${
                  departmentColors[emp.role] || "bg-white"
                }`}
              >
                {emp.name}
              </td>

              {daysInMonth.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const attendance = attendanceMap[`${emp.id}-${dateKey}`];

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

                let bg = "bg-white";

                if (status) {
                  bg = statusColors[status];
                }

                if (status === "Present" && isUndertime) {
                  bg = statusColors["Halfday"];
                } else if (isSunday) {
                  bg = "bg-yellow-100";
                } else if (isTripBasedEmployee) {
                  bg = "bg-gray-100";
                }

                return (
                  <td
                    key={dateKey}
                    title={isTripBasedEmployee ? tripTooltip : tooltipText}
                    className={`border text-center font-bold min-w-17.5 ${bg} ${
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
                        {isTripBasedEmployee ? (
                          <div className="flex items-center justify-center">
                            <span className="text-base font-extrabold">
                              {completedTrips > 0 ? completedTrips : ""}
                            </span>
                          </div>
                        ) : [
                            "On Leave",
                            "Absent",
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
                          className="text-gray-400 hover:text-blue-600 text-lg"
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
