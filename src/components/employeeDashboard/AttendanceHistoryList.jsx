import React from "react";
import { statusColors } from "../../constants/statusColors";

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export default function AttendanceHistoryList({ records }) {
  if (!records.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
        No attendance records for this period yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div
          key={record.id}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface-hover p-4"
        >
          <div>
            <p className="text-sm font-semibold text-fg">
              {formatDate(record.attendance_date)}
            </p>
            <p className="text-xs text-fg-muted">
              In: {record.check_in_time || "--"} &nbsp;•&nbsp; Out:{" "}
              {record.check_out_time || "--"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-gray-800 ${
              statusColors[record.status] || "bg-gray-100"
            }`}
          >
            {record.status}
          </span>
        </div>
      ))}
    </div>
  );
}
