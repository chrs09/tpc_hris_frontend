import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format, addDays, isToday } from "date-fns";
import { attendanceRecord } from "../../api/attendance";

const NEEDS_REVIEW_STATUSES = [
  "NEEDS_REVIEW",
  "NO_PROFILE_PHOTO",
  "FACE_MATCH_FAILED",
];

const REVIEW_REASON_LABEL = {
  NEEDS_REVIEW: "Needs Review",
  NO_PROFILE_PHOTO: "No Profile Photo",
  FACE_MATCH_FAILED: "Match Failed",
};

// Dashboard widget surfacing attendance selfies that face recognition
// flagged and a superadmin has not yet approved/rejected (see
// AttendanceGridReview.jsx, which owns the actual Approve/Reject action) --
// on its own date toggle so an admin can catch up on days they missed,
// independent of whatever date the full Attendance page happens to be on.
const NeedsReviewCard = () => {
  const [date, setDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = format(date, "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        const data = await attendanceRecord({
          attendance_date: dateKey,
          includePhotos: false,
        });

        const list = Array.isArray(data) ? data : data?.records || [];

        if (!cancelled) {
          setRecords(
            list.filter((item) =>
              NEEDS_REVIEW_STATUSES.includes(item.face_review_status),
            ),
          );
        }
      } catch (error) {
        console.error("Failed to load needs-review attendance:", error);
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [dateKey]);

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
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-muted"
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
          No flagged attendance for this date.
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
                  {record.employee_name || `Employee #${record.employee_id}`}
                </p>
                <p className="text-[11px] text-amber-700 truncate">
                  {record.employee_department || record.department || "—"} •{" "}
                  {REVIEW_REASON_LABEL[record.face_review_status] ||
                    "Needs Review"}
                </p>
              </div>

              <Link
                to="/dashboard/attendance"
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
