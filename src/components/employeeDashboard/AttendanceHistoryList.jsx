import React from "react";
import { CalendarDays, List } from "lucide-react";
import { statusColors } from "../../constants/statusColors";
import useViewType from "../../hooks/useViewType";

// My attendance as a month-style calendar (default) or the plain list.
// start / end ("YYYY-MM-DD") are the period shown -- a payroll cutoff or a
// month; without them the calendar spans the records' first..last day.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseIso = (value) => new Date(`${value}T00:00:00`);
const todayPH = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// "08:24 AM" -> "8:24a"
const shortTime = (value) => {
  if (!value || value === "--") return null;
  const m = String(value).match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
  return m ? `${Number(m[1])}:${m[2]}${m[3].toLowerCase()}` : value;
};

function AttendanceCalendar({ records, start, end }) {
  const byDate = Object.fromEntries(records.map((r) => [r.attendance_date, r]));
  const dates = records.map((r) => r.attendance_date).sort();
  const first = parseIso(start || dates[0] || todayPH());
  const last = parseIso(end || dates[dates.length - 1] || todayPH());
  const today = todayPH();

  // Whole weeks, Sunday to Saturday, around the period.
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - last.getDay()));
  const days = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const usedStatuses = [...new Set(records.map((r) => r.status).filter(Boolean))];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = iso(day);
          const inPeriod = day >= first && day <= last;
          const record = inPeriod ? byDate[key] : null;
          const isToday = key === today;
          const timeIn = shortTime(record?.check_in_time);
          const timeOut = shortTime(record?.check_out_time);
          return (
            <div
              key={key}
              title={
                record
                  ? `${formatDate(key)} · ${record.status}${record.check_in_time ? ` · In ${record.check_in_time}` : ""}${
                      record.check_out_time ? ` · Out ${record.check_out_time}` : ""
                    }${record.remarks ? ` · ${record.remarks}` : ""}`
                  : formatDate(key)
              }
              className={`flex min-h-14 flex-col rounded-lg p-1 sm:min-h-[4.5rem] sm:p-1.5 ${
                !inPeriod
                  ? "opacity-30"
                  : record
                    ? `${statusColors[record.status] || "bg-gray-100"} text-gray-800`
                    : "border border-border bg-surface-hover text-fg"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <span className="text-xs font-semibold leading-none">
                {day.getDate() === 1 || (inPeriod && iso(day) === iso(first))
                  ? day.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : day.getDate()}
              </span>
              {record && (
                <>
                  <span className="mt-1 truncate text-[10px] font-semibold leading-tight">
                    {record.status}
                  </span>
                  {(timeIn || timeOut) && (
                    <span className="mt-auto hidden truncate text-[10px] leading-tight opacity-80 sm:block">
                      {timeIn || "--"}–{timeOut || "--"}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {usedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-fg-muted">
          {usedStatuses.map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-sm ${statusColors[status] || "bg-gray-100"}`} />
              {status}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm border border-border bg-surface-hover" />
            No record
          </span>
        </div>
      )}
    </div>
  );
}

export default function AttendanceHistoryList({ records, start, end }) {
  // "cards" = calendar (shared view-type hook), "list" = the plain list.
  const [viewType, setViewType] = useViewType("my_attendance_view", "cards");

  const toggle = (
    <div className="mb-3 flex justify-end">
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {[
          { key: "cards", icon: CalendarDays, label: "Calendar" },
          { key: "list", icon: List, label: "List" },
        ].map((option) => {
          const { key, label } = option;
          const ToggleIcon = option.icon;
          return (
          <button
            key={key}
            type="button"
            onClick={() => setViewType(key)}
            aria-pressed={viewType === key}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
              viewType === key ? "bg-primary text-primary-foreground" : "text-fg-muted hover:text-fg"
            }`}
          >
            <ToggleIcon size={13} /> {label}
          </button>
          );
        })}
      </div>
    </div>
  );

  if (!records.length && viewType === "list") {
    return (
      <>
        {toggle}
        <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
          No attendance records for this period yet.
        </div>
      </>
    );
  }

  if (viewType === "cards") {
    return (
      <>
        {toggle}
        <AttendanceCalendar records={records} start={start} end={end} />
      </>
    );
  }

  return (
    <>
      {toggle}
      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-hover p-4"
          >
            <div>
              <p className="text-sm font-semibold text-fg">{formatDate(record.attendance_date)}</p>
              <p className="text-xs text-fg-muted">
                In: {record.check_in_time || "--"} &nbsp;•&nbsp; Out: {record.check_out_time || "--"}
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
    </>
  );
}
