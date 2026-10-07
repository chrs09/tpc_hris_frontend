import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RotateCw } from "lucide-react";
import {
  approveAttendance,
  getAttendanceForMyApproval,
  rejectAttendance,
  rotateAttendancePhoto,
} from "../../api/attendance";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import WorkReport from "../../components/attendance/WorkReport";

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
  const [rotatingKey, setRotatingKey] = useState(null);

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
    // A head who isn't the last approver passes it up with remarks (what
    // they checked) for the next head's final approval.
    const steps = item.approval_steps || [];
    const currentIndex = steps.findIndex((s) => s.state === "current");
    const passesUp = currentIndex >= 0 && currentIndex < steps.length - 1;
    let remarks = null;
    if (approve) {
      remarks = await promptDialog(
        passesUp
          ? `Approve ${item.employee_name}'s ${item.side_label.toLowerCase()} and pass it to ${steps[currentIndex + 1].name} for the final approval. Remarks (required -- what did you check?):`
          : `Approve ${item.employee_name}'s ${item.side_label.toLowerCase()}? Remarks (optional):`,
      );
      if (remarks === null) return;
      if (passesUp && !remarks.trim()) {
        toast.error("Add remarks for the next approver.");
        return;
      }
    } else {
      remarks = await promptDialog(
        `Reject ${item.employee_name}'s ${item.side_label.toLowerCase()} on ${item.attendance_date}? Reason (optional):`,
      );
      if (remarks === null) return;
    }
    try {
      setActioningKey(item.key);
      const result = approve
        ? await approveAttendance(item.attendance_id, item.side, remarks.trim())
        : await rejectAttendance(item.attendance_id, item.side, remarks.trim());
      toast.success(result?.message || (approve ? "Approved." : "Rejected."));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setActioningKey(null);
    }
  };

  // Sideways selfie (old iPhone uploads): turn it 90° clockwise. The
  // face match is re-run, so the note/score update too.
  const rotate = async (item) => {
    try {
      setRotatingKey(item.key);
      const result = await rotateAttendancePhoto(item.attendance_id, item.side, 90);
      const patch = {
        photo_url: result.photo_url,
        review_status: result.review_status,
        review_reason: result.review_reason,
      };
      setItems((current) =>
        current.map((i) => (i.key === item.key ? { ...i, ...patch } : i)),
      );
      setPhoto((current) => (current?.key === item.key ? { ...current, ...patch } : current));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Couldn't rotate the photo.");
    } finally {
      setRotatingKey(null);
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
              <div className="relative h-28 w-24 shrink-0">
                <button
                  type="button"
                  onClick={() => item.photo_url && setPhoto(item)}
                  className="h-full w-full overflow-hidden rounded-xl bg-surface-hover"
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
                {canEditPage && item.photo_url && (
                  <button
                    type="button"
                    title="Rotate photo 90° clockwise"
                    aria-label="Rotate photo"
                    disabled={rotatingKey === item.key}
                    onClick={() => rotate(item)}
                    className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                  >
                    <RotateCw size={14} className={rotatingKey === item.key ? "animate-spin" : ""} />
                  </button>
                )}
              </div>

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
                <WorkReport
                  text={item.work_accomplished}
                  proofUrl={item.work_proof_url}
                  missing={item.work_proof_missing}
                  compact
                />
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
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={photo.photo_url}
              alt={`${photo.employee_name} ${photo.side_label}`}
              className="max-h-[80vh] max-w-full rounded-xl"
            />
            {canEditPage && (
              <button
                type="button"
                disabled={rotatingKey === photo.key}
                onClick={() => rotate(photo)}
                className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
              >
                <RotateCw size={16} className={rotatingKey === photo.key ? "animate-spin" : ""} />
                Rotate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
