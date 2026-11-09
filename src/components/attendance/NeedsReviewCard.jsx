import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format, addDays, isToday, differenceInCalendarDays } from "date-fns";
import { getAttendanceForMyApproval } from "../../api/attendance";

const REVIEW_REASON_LABEL = {
  NEEDS_REVIEW: "Needs Review",
  NO_PROFILE_PHOTO: "No Profile Photo",
  FACE_MATCH_FAILED: "Match Failed",
  MISSED_TIME_OUT: "Missed Time Out",
};

// /attendance/for-my-approval only covers the last 30 days.
const MAX_DAYS_BACK = 30;

// Dashboard widget: attendance time in/out waiting for review that THIS
// user is assigned to (their turn on the org chart chain, their own team
// as a head, or everyone for a superadmin / Attendance grid "Can edit"
// grant -- decided by the backend's /attendance/for-my-approval). Only
// rendered for attendance reviewers (see AdminDashboard.jsx). On its own
// date toggle so a reviewer can catch up on days they missed.
const NeedsReviewCard = () => {
  const [date, setDate] = useState(new Date());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = format(date, "yyyy-MM-dd");
  const atOldest = differenceInCalendarDays(new Date(), date) >= MAX_DAYS_BACK;

  useEffect(() => {
    let cancelled = false;
    getAttendanceForMyApproval()
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load needs-review attendance:", error);
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One row per attendance record (time in and time out may both wait).
  const records = useMemo(() => {
    const byRecord = new Map();
    items
      .filter((item) => item.attendance_date === dateKey)
      .forEach((item) => {
        const row = byRecord.get(item.attendance_id) || {
          id: item.attendance_id,
          employee_name: item.employee_name,
          position: item.position,
          sides: [],
        };
        row.sides.push(
          `${item.side_label}: ${
            item.outside_geofence
              ? "Outside Geofence"
              : REVIEW_REASON_LABEL[item.review_status] || item.review_status
          }`,
        );
        byRecord.set(item.attendance_id, row);
      });
    return [...byRecord.values()];
  }, [items, dateKey]);

  return (
    <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-fg">
            Needs Review {records.length > 0 && `(${records.length})`}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, -1))}
            disabled={atOldest}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous day"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-[11px] text-fg-muted min-w-24 text-center">
            {isToday(date) ? "Today" : format(date, "MMM d, yyyy")}
          </span>

          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={isToday(date)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-fg-muted">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-xs text-fg-muted">
          Nothing waiting for your review on this date.
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2.5 border border-amber-200"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900 truncate">
                  {record.employee_name}
                </p>
                <p className="text-[11px] text-amber-700 truncate">
                  {record.position || "—"} • {record.sides.join(", ")}
                </p>
              </div>

              <Link
                to="/dashboard/approvals?tab=attendance"
                className="shrink-0 text-[11px] font-medium text-primary hover:text-primary-hover"
              >
                Review
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NeedsReviewCard;
