import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveAttendance,
  getAttendanceForMyApproval,
  rejectAttendance,
} from "../../api/attendance";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";

const REASON_LABELS = {
  NEEDS_REVIEW: "Needs review",
  FACE_MATCH_FAILED: "Face match failed",
  NO_PROFILE_PHOTO: "No profile photo to compare",
};

// Attendance Approvals -- for Org Chart heads with Attendance ticked:
// time in/out that needs review (outside the allowed area, or the face
// check) and whose turn is with me. Approving passes it to the next head
// up if there is one; the last approval finishes it.
export default function AttendanceApprovals() {
  // View-only access (e.g. Grid View with "Can edit: No") hides the buttons.
  const canEditPage = usePageCanEdit();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningKey, setActioningKey] = useState(null);
  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState(null);

  const load = async () => {
    try {
      setItems(await getAttendanceForMyApproval());
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (item, approve) => {
    if (
      !approve &&
      !(await confirmDialog(
        `Reject ${item.employee_name}'s ${item.side_label.toLowerCase()} on ${item.attendance_date}?`,
      ))
    ) {
      return;
    }
    try {
      setActioningKey(item.key);
      const result = approve
        ? await approveAttendance(item.attendance_id, item.side)
        : await rejectAttendance(item.attendance_id, item.side);
      toast.success(result?.message || (approve ? "Approved." : "Rejected."));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setActioningKey(null);
    }
  };

  const filtered = items.filter((item) =>
    matchesSearch(
      search,
      item.employee_name,
      item.position,
      item.side_label,
      item.attendance_date,
      item.address,
      item.review_reason,
    ),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Attendance Approvals</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Time in/out outside the allowed area or with a face-check problem,
            waiting on you. Approving passes it to the next head up, if any.
          </p>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, date, reason..."
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
          {items.length ? "Nothing matches your search." : "Nothing waiting on you."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={item.key}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <button
                type="button"
                onClick={() => item.photo_url && setPhoto(item)}
                className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-hover"
              >
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={`${item.employee_name} ${item.side_label}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-fg-subtle">No photo</span>
                )}
              </button>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-fg">{item.employee_name}</p>
                  <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                    {item.side_label}
                  </span>
                </div>
                <p className="text-xs text-fg-muted">
                  {item.attendance_date}
                  {item.time ? ` · ${item.time}` : ""}
                  {item.position ? ` · ${item.position}` : ""}
                </p>
                {item.outside_geofence && (
                  <p className="text-xs font-semibold text-danger">📍 Outside geofence</p>
                )}
                <p className="text-xs text-fg-subtle">
                  {item.review_reason || REASON_LABELS[item.review_status]}
                </p>
                {item.address && (
                  <p className="truncate text-[11px] text-fg-subtle" title={item.address}>
                    {item.address}
                  </p>
                )}
                <ApprovalProgress steps={item.approval_steps} />
                <ApprovedBy log={item.approval_log} />

                {canEditPage && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={actioningKey === item.key}
                    onClick={() => act(item, true)}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actioningKey === item.key}
                    onClick={() => act(item, false)}
                    className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {photo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhoto(null)}
        >
          <img
            src={photo.photo_url}
            alt={`${photo.employee_name} ${photo.side_label}`}
            className="max-h-[90vh] max-w-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
