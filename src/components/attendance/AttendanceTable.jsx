import React from "react";
import { format, getDay } from "date-fns";

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
                const status = attendanceMap[`${emp.id}-${dateKey}`];

                const editable = isSuperAdmin && isEditableDate(day);
                const isSunday = getDay(day) === 0;

                let bg = "bg-white";

                // Priority 1: Status color
                if (status) {
                  bg = statusColors[status];
                }
                // Priority 2: Sunday highlight
                else if (isSunday) {
                  bg = "bg-yellow-100";
                }
                // Priority 3: Editable but empty
                else if (editable) {
                  bg = "bg-gray-200";
                }

                return (
                  <td
                    key={dateKey}
                    className={`border text-center font-bold ${bg} ${
                      editable
                        ? "cursor-pointer hover:brightness-95"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!editable) return;

                      onCellClick(emp, dateKey, status || "Present");
                    }}
                  >
                    {status ? getStatusSymbol(status) : ""}
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
