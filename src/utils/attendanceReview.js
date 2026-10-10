// Approvals -> Attendance: what kind of check each item needs, and the
// server's reason in plain words, for heads. The phone app has the same
// helper (tytan_mobile/src/utils/attendanceReview.ts) -- keep in step.

export const REVIEW_TYPES = [
  { key: "missed", label: "Missed time out" },
  { key: "work", label: "No work proof" },
  { key: "outside", label: "Outside area" },
  { key: "face", label: "Face check" },
];

const FACE_STATUSES = ["FACE_MATCH_FAILED", "NO_PROFILE_PHOTO"];

export const reviewTypesOf = (item) => {
  const types = [];
  if (String(item.review_status || "").startsWith("MISSED_TIME_OUT") || item.missed_time_out) {
    types.push("missed");
  }
  if (item.side === "time_out" && item.work_proof_missing) types.push("work");
  if (item.outside_geofence) types.push("outside");
  const reason = String(item.review_reason || "");
  if (
    FACE_STATUSES.includes(item.review_status) ||
    /face similarity|faces detected|no face/i.test(reason)
  ) {
    types.push("face");
  }
  return types;
};

export const friendlyReason = (reason) => {
  if (!reason) return "";
  return String(reason)
    .replace(/Face similarity below threshold \((-?[\d.]+)\)\.?/i, (_, score) => {
      const percent = Math.max(0, Math.round(Number(score) * 100));
      return `Face didn't match their profile photo (${percent}% match).`;
    })
    .replace(/Multiple faces detected in attendance photo\.?/i, "More than one face in the selfie.")
    .replace(/No face detected in attendance photo\.?/i, "No face found in the selfie.")
    .replace(/Employee has no profile photo\.?/i, "No profile photo to compare with.")
    .replace(/No work photo\/video uploaded\.?/i, "No photo or video of the work.")
    .trim();
};

export const TYPE_STYLES = {
  missed: "bg-warning/15 text-warning",
  work: "bg-primary/15 text-primary",
  outside: "bg-danger/15 text-danger",
  face: "bg-surface-active text-fg-muted",
};
