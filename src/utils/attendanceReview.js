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

// Type tags stay neutral -- color on a card means its STATUS (below).
export const TYPE_STYLES = {
  missed: "border border-border text-fg-muted",
  work: "border border-border text-fg-muted",
  outside: "border border-border text-fg-muted",
  face: "border border-border text-fg-muted",
};

// Where the item stands for the person looking at it (color indicator).
export const reviewStateOf = (item) => {
  if (item.review_status === "MISSED_TIME_OUT_UNFILED") {
    return { key: "unfiled", label: "Not filed yet -- you can enter it" };
  }
  if (item.can_act === false) {
    return { key: "approved", label: `You approved -- waiting for ${item.waiting_on || "the next head"}` };
  }
  if (item.my_turn === false && item.waiting_on) {
    return { key: "others", label: `Waiting for ${item.waiting_on}` };
  }
  return { key: "yours", label: "Waiting for you" };
};

export const REVIEW_STATES = [
  { key: "yours", label: "Waiting for you" },
  { key: "unfiled", label: "Not filed yet" },
  { key: "others", label: "Waiting for another head" },
  { key: "approved", label: "You approved" },
];

// Card edge + status pill colors per state.
export const STATE_STYLES = {
  yours: { border: "border-l-warning", pill: "bg-warning/15 text-warning", dot: "bg-warning" },
  unfiled: { border: "border-l-danger", pill: "bg-danger/15 text-danger", dot: "bg-danger" },
  others: { border: "border-l-primary", pill: "bg-primary/15 text-primary", dot: "bg-primary" },
  approved: { border: "border-l-success", pill: "bg-success/15 text-success", dot: "bg-success" },
};
