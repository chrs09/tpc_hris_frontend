import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import ApprovedBy from "../approvals/ApprovedBy";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

// "YYYY-MM-DD" in the viewer's own date (PH for this app's users).
const dayOf = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// mode="approve": Pending Approvals -- the amount and remarks (required
// when it passes up to the next head, like mobile), with earlier heads'
// approvals and remarks shown above.
// mode="release": the receipt photo proving the money was sent, with an
// optional reference (GCash ref, check no.) -- All Requests "+ Add
// receipt" and Outstanding Balances "Record Release".
export default function CashAdvanceReleaseModal({
  request,
  mode = "approve",
  isFinal = true,
  nextApprover = null,
  busy = false,
  onClose,
  onSubmit,
}) {
  // Rendered fresh per request (the parent keys it), so these start
  // from the request each time.
  const [amount, setAmount] = useState(String(request.approved_amount ?? request.amount));
  const [reference, setReference] = useState(
    mode === "release" ? request.release_reference || "" : "",
  );
  const [remarks, setRemarks] = useState("");
  // The day the money actually went out -- not the day the photo is
  // uploaded. Starts on the recorded release day, else today.
  const [releasedDate, setReleasedDate] = useState(dayOf(request.released_at || null));
  const today = dayOf(null);
  const approvedDay = request.approved_at ? dayOf(request.approved_at) : "";
  const [receipt, setReceipt] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const showReceipt = mode === "release";

  const pickFile = (file) => {
    if (!file) return;
    setReceipt(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      approvedAmount: Number(amount),
      reference: reference.trim(),
      remarks: remarks.trim(),
      receipt,
      releasedDate: mode === "release" ? releasedDate : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-fg">
              {mode === "release" ? "Record Release" : "Approve Cash Advance"}
            </h3>
            <p className="text-sm text-fg-subtle">
              {request.employee_name} · requested {peso(request.amount)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>

        {mode === "approve" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-fg">Amount to approve</label>
            <input
              type="number"
              min="1"
              max={request.amount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
            />
            {request.approved_amount != null && request.approved_amount !== request.amount && (
              <p className="mt-1 text-xs text-fg-subtle">
                {peso(request.approved_amount)} approved so far by an earlier approver.
              </p>
            )}
          </div>
        )}

        {mode === "approve" && (request.approval_log || []).some((e) => e.action === "approved") && (
          <div className="rounded-xl bg-surface-hover px-3 py-2">
            <p className="mb-1 text-xs font-medium text-fg-muted">Earlier approvals</p>
            <ApprovedBy log={request.approval_log} money />
          </div>
        )}

        {mode === "approve" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-fg">
              Remarks{" "}
              <span className="font-normal text-fg-subtle">
                {isFinal ? "(optional)" : `for ${nextApprover || "the next approver"} (required)`}
              </span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Checked the balance, no open cash advance."
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
            />
          </div>
        )}

        {mode === "approve" && !isFinal && (
          <p className="rounded-xl bg-surface-hover px-3 py-2 text-xs text-fg-muted">
            This passes it to {nextApprover || "the next approver"} for the final approval.
          </p>
        )}

        {showReceipt && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg">
                Receipt that the cash advance was sent
              </label>
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Receipt" className="max-h-56 w-full rounded-xl border border-border object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setReceipt(null);
                      setPreview(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-6 text-sm text-fg-muted hover:bg-surface-hover">
                  <ImagePlus size={22} />
                  Upload photo / screenshot (GCash, bank, signed voucher)
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>
              )}
              {mode === "release" && request.release_receipt_url && !preview && (
                <div className="mt-2 flex items-center gap-2 text-xs text-fg-subtle">
                  <img
                    src={request.release_receipt_url}
                    alt="Current receipt"
                    className="h-12 w-12 rounded-lg border border-border object-cover"
                  />
                  Current receipt -- uploading a new one replaces it.
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg">
                Reference no. <span className="font-normal text-fg-subtle">(optional)</span>
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. GCash ref, check no."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
            </div>
            {mode === "release" && (
              <div>
                <label htmlFor="ca-released-date" className="mb-1 block text-sm font-medium text-fg">
                  Date released
                </label>
                <input
                  id="ca-released-date"
                  type="date"
                  value={releasedDate}
                  min={approvedDay || undefined}
                  max={today}
                  onChange={(e) => setReleasedDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
                />
                <p className="mt-1 text-xs text-fg-subtle">
                  The day the money was actually given or sent, not the day you upload the receipt.
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (mode === "release" && ((!receipt && !reference.trim()) || !releasedDate))}
            className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-50"
          >
            {busy ? "Saving..." : mode === "release" ? "Save" : "Approve"}
          </button>
        </div>
      </form>
    </div>
  );
}
