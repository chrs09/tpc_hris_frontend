import { useEffect, useMemo, useState } from "react";
import { Paperclip, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  TRIP_EXPENSE_CATEGORIES,
  approveTripExpense,
  cancelTripExpense,
  rejectTripExpense,
  releaseTripBudget,
  returnTripExpense,
  reviewTripExpense,
  saveActualLines,
  submitTripExpense,
  uploadLineReceipt,
} from "../../api/tripExpenses";
import { confirmDialog, promptDialog } from "../ui/dialog/dialogService";
import ApprovalProgress from "../approvals/ApprovalProgress";
import ApprovedBy from "../approvals/ApprovedBy";
import TripExpenseStatus from "./TripExpenseStatus";
import { peso } from "./format";


const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";
const btn = "rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";
const errorOf = (error, fallback) => error?.response?.data?.detail || fallback;
const todayPH = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const blankLine = () => ({ key: Math.random(), category: "", description: "", amount: "" });

// One trip budget / expense report: everything about it, plus what the
// viewer can do now --
//   mode "driver":   liquidate / add expenses + receipts, submit, cancel
//   mode "approver": approve / reject a budget (Org Chart head)
//   mode "finance":  release, review (allow / disallow per line, settle),
//                    return, reject -- and liquidate for the driver.
export default function TripExpenseDetail({ expense, mode, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState([]);
  const [linesDirty, setLinesDirty] = useState(false);

  useEffect(() => {
    setLines(
      expense.actual_lines.map((l) => ({
        key: l.id,
        id: l.id,
        category: l.category,
        description: l.description || "",
        amount: String(l.amount),
        receipt_url: l.receipt_url,
      })),
    );
    setLinesDirty(false);
  }, [expense]);

  const editable =
    ["released", "returned", "draft"].includes(expense.status) &&
    (mode === "driver" || mode === "finance");
  const spent = lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const run = async (fn, success) => {
    try {
      setBusy(true);
      const updated = await fn();
      if (success) toast.success(success);
      await onChanged?.(updated);
    } catch (error) {
      toast.error(errorOf(error, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  };

  const setLine = (key, field, value) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
    setLinesDirty(true);
  };

  const payloadLines = () =>
    lines.map((l) => ({
      id: l.id,
      category: l.category,
      description: l.description,
      amount: Number(l.amount || 0),
    }));

  const saveLines = () => run(() => saveActualLines(expense.id, payloadLines()), "Saved.");

  const attach = async (line, file) => {
    if (!file) return;
    if (!line.id || linesDirty) {
      toast.error("Save the expenses first, then attach receipts.");
      return;
    }
    await run(() => uploadLineReceipt(expense.id, line.id, file), "Receipt attached.");
  };

  const submit = async () => {
    const missing = lines.filter((l) => !l.receipt_url).length;
    const ok = await confirmDialog(
      `${expense.kind === "budget" ? "Submit this liquidation" : "Submit this expense report"} for review?${
        missing ? ` ${missing} expense(s) have no receipt -- the reviewer may disallow them.` : ""
      }`,
    );
    if (!ok) return;
    await run(async () => {
      if (linesDirty) await saveActualLines(expense.id, payloadLines());
      return submitTripExpense(expense.id);
    }, "Submitted for review.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface text-fg shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              {expense.kind === "budget" ? "Trip budget" : "Expense report"} #{expense.id}
            </p>
            <h2 className="text-lg font-bold">{expense.employee_name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <TripExpenseStatus status={expense.status} />
              {expense.trip_label && <span>Trip: {expense.trip_label}</span>}
              {expense.vehicle_unit_label && <span>Unit: {expense.vehicle_unit_label}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          {expense.purpose && <p className="text-fg-muted">{expense.purpose}</p>}
          {expense.note && ["returned", "rejected"].includes(expense.status) && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-danger">
              {expense.status === "returned" ? "To fix: " : "Rejected: "}
              {expense.note}
            </p>
          )}
          <ApprovalProgress steps={expense.approval_steps} />
          <ApprovedBy log={expense.approval_log} />

          {/* Budget asked for */}
          {expense.kind === "budget" && (
            <section>
              <h3 className="mb-2 font-semibold">Budget requested</h3>
              <LineTable lines={expense.request_lines} />
              <p className="mt-1 text-right font-semibold">Total {peso(expense.requested_total)}</p>
              {expense.released_amount != null && (
                <p className="mt-2 rounded-lg bg-surface-hover px-3 py-2 text-xs text-fg-muted">
                  Released {peso(expense.released_amount)} by {expense.release_method}
                  {expense.release_reference ? ` (${expense.release_reference})` : ""} ·{" "}
                  {expense.released_at} · {expense.released_by}
                  {expense.release_photo_url && (
                    <>
                      {" · "}
                      <a href={expense.release_photo_url} target="_blank" rel="noreferrer" className="text-primary underline">
                        photo
                      </a>
                    </>
                  )}
                </p>
              )}
            </section>
          )}

          {/* Actual expenses: editable while liquidating / drafting */}
          {expense.status !== "for_review" &&
            (editable || expense.actual_lines.length > 0 || expense.kind === "budget") && (
              <section>
                <h3 className="mb-2 font-semibold">
                  {expense.kind === "budget" ? "Liquidation (actual expenses)" : "Expenses"}
                </h3>
                {editable ? (
                  <div className="space-y-2">
                    {lines.map((line) => (
                      <div key={line.key} className="rounded-xl border border-border p-2.5">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_110px_auto]">
                          <select
                            value={line.category}
                            onChange={(e) => setLine(line.key, "category", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Category</option>
                            {TRIP_EXPENSE_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={line.description}
                            onChange={(e) => setLine(line.key, "description", e.target.value)}
                            placeholder="Details (e.g. Ferry Cebu-Tagbilaran)"
                            className={inputClass}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.amount}
                            onChange={(e) => setLine(line.key, "amount", e.target.value)}
                            placeholder="Amount"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLines((prev) => prev.filter((l) => l.key !== line.key));
                              setLinesDirty(true);
                            }}
                            className="justify-self-end rounded-lg p-1.5 text-fg-muted hover:bg-danger/10 hover:text-danger"
                            aria-label="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          {line.receipt_url ? (
                            <a href={line.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline">
                              Receipt attached
                            </a>
                          ) : (
                            <span className="text-warning">No receipt yet</span>
                          )}
                          <label className="flex cursor-pointer items-center gap-1 text-fg-muted hover:text-fg">
                            <Paperclip size={13} />
                            {line.receipt_url ? "Replace" : "Attach receipt"}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => attach(line, e.target.files?.[0])}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setLines((prev) => [...prev, blankLine()]);
                        setLinesDirty(true);
                      }}
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      <Plus size={15} /> Add expense
                    </button>
                    <div className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2">
                      <span>Total spent {peso(spent)}</span>
                      {expense.kind === "budget" && expense.released_amount != null && (
                        <span className={spent > expense.released_amount ? "text-success" : "text-fg-muted"}>
                          {spent > expense.released_amount
                            ? `Over by ${peso(spent - expense.released_amount)} (reimbursed if allowed)`
                            : `Unspent ${peso(expense.released_amount - spent)} (to return)`}
                        </span>
                      )}
                    </div>
                  </div>
                ) : expense.actual_lines.length ? (
                  <>
                    <LineTable lines={expense.actual_lines} showReview={expense.status === "completed"} />
                    <p className="mt-1 text-right font-semibold">Total spent {peso(expense.actual_total)}</p>
                  </>
                ) : (
                  <p className="text-fg-subtle">Not liquidated yet.</p>
                )}
              </section>
            )}

          {mode === "finance" && expense.status === "for_review" && (
            <ReviewForm expense={expense} busy={busy} run={run} />
          )}
          {mode !== "finance" && expense.status === "for_review" && (
            <section>
              <h3 className="mb-2 font-semibold">Submitted for review</h3>
              <LineTable lines={expense.actual_lines} />
              <p className="mt-1 text-right font-semibold">Total spent {peso(expense.actual_total)}</p>
            </section>
          )}

          {expense.status === "completed" && <Settlement expense={expense} />}

          {mode === "finance" && expense.status === "for_release" && (
            <ReleaseForm expense={expense} busy={busy} run={run} />
          )}

          {expense.history?.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold">History</h3>
              <ul className="space-y-0.5 text-xs text-fg-muted">
                {expense.history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString()} · {h.action} · {h.by}
                    {h.note ? ` -- ${h.note}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
          {editable && (
            <>
              <button type="button" disabled={busy || !linesDirty} onClick={saveLines} className={`${btn} border border-border`}>
                Save
              </button>
              <button
                type="button"
                disabled={busy || (expense.kind === "report" && lines.length === 0)}
                onClick={submit}
                className={`${btn} bg-primary text-primary-foreground hover:bg-primary-hover`}
              >
                Submit for review
              </button>
            </>
          )}
          {["pending_approval", "for_release", "draft"].includes(expense.status) &&
            (mode === "driver" || mode === "finance") && (
              <button
                type="button"
                disabled={busy}
                onClick={async () =>
                  (await confirmDialog("Cancel this request?")) &&
                  run(() => cancelTripExpense(expense.id), "Cancelled.")
                }
                className={`${btn} border border-danger/40 text-danger hover:bg-danger/10`}
              >
                Cancel request
              </button>
            )}
          {mode === "approver" && expense.status === "pending_approval" && expense.can_act !== false && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const reason = await promptDialog("Reason for rejecting this budget:");
                  if (reason) run(() => rejectTripExpense(expense.id, reason), "Rejected.");
                }}
                className={`${btn} border border-danger/40 text-danger hover:bg-danger/10`}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const remarks = await promptDialog("Approve this budget? Remarks (optional):");
                  if (remarks !== null) run(() => approveTripExpense(expense.id, remarks), "Approved.");
                }}
                className={`${btn} bg-success text-success-foreground`}
              >
                Approve
              </button>
            </>
          )}
          {mode === "finance" &&
            (expense.status === "for_release" || (expense.kind === "report" && expense.status === "for_review")) && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const reason = await promptDialog("Reason for rejecting:");
                  if (reason) run(() => rejectTripExpense(expense.id, reason), "Rejected.");
                }}
                className={`${btn} border border-danger/40 text-danger hover:bg-danger/10`}
              >
                Reject
              </button>
            )}
          {mode === "finance" && expense.status === "for_review" && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const reason = await promptDialog("What should the driver fix?");
                if (reason) run(() => returnTripExpense(expense.id, reason), "Returned to the driver.");
              }}
              className={`${btn} border border-border`}
            >
              Return to driver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LineTable({ lines, showReview = false }) {
  if (!lines?.length) return <p className="text-fg-subtle">None.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-surface-hover text-fg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-left font-medium">Details</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            {showReview && <th className="px-3 py-2 text-right font-medium">Allowed</th>}
            <th className="px-3 py-2 text-left font-medium">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-t border-border">
              <td className="px-3 py-2">{l.category_label}</td>
              <td className="px-3 py-2 text-fg-muted">
                {l.description || "—"}
                {showReview && l.review_note && <span className="block text-danger">{l.review_note}</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{peso(l.amount)}</td>
              {showReview && (
                <td className="px-3 py-2 text-right tabular-nums">{peso(l.allowed_amount)}</td>
              )}
              <td className="px-3 py-2">
                {l.receipt_url ? (
                  <a href={l.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline">
                    View
                  </a>
                ) : l.stage === "actual" ? (
                  <span className="text-warning">None</span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Settlement({ expense }) {
  return (
    <section className="rounded-xl border border-success/30 bg-success/5 p-3">
      <h3 className="mb-1 font-semibold">Settled</h3>
      <p>
        Allowed {peso(expense.allowed_total)}
        {expense.kind === "budget" && ` of ${peso(expense.released_amount)} released`}.
      </p>
      {expense.short_amount != null && (
        <p>
          Unspent {peso(expense.short_amount)}:{" "}
          {expense.short_settlement === "payroll" ? "deducted from payroll" : "returned in cash"}.
        </p>
      )}
      {expense.reimburse_amount != null && (
        <p>
          Reimbursed {peso(expense.reimburse_amount)} with the payroll covering{" "}
          {expense.reimburse_payroll_date}.
        </p>
      )}
      <p className="mt-1 text-xs text-fg-muted">
        Reviewed by {expense.reviewed_by} · {expense.reviewed_at}
        {expense.review_note ? ` -- ${expense.review_note}` : ""}
      </p>
    </section>
  );
}

function ReleaseForm({ expense, busy, run }) {
  const [amount, setAmount] = useState(String(expense.requested_total));
  const [method, setMethod] = useState("check");
  const [reference, setReference] = useState("");
  const [photo, setPhoto] = useState(null);
  return (
    <section className="rounded-xl border border-border p-3">
      <h3 className="mb-2 font-semibold">Release</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-xs text-fg-muted">
          Amount
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </label>
        <label className="text-xs text-fg-muted">
          By
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
            <option value="check">Check</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <label className="text-xs text-fg-muted">
          {method === "check" ? "Check no." : "Reference"} (optional)
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
        </label>
      </div>
      <label className="mt-2 block text-xs text-fg-muted">
        Photo of the check / signed voucher (optional)
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="mt-1 block text-xs" />
      </label>
      <button
        type="button"
        disabled={busy || !(Number(amount) > 0)}
        onClick={() =>
          run(() => releaseTripBudget(expense.id, { amount, method, reference, photo }), "Released.")
        }
        className={`${btn} mt-3 bg-primary text-primary-foreground hover:bg-primary-hover`}
      >
        Release {peso(amount)}
      </button>
    </section>
  );
}

function ReviewForm({ expense, busy, run }) {
  const [rows, setRows] = useState(() =>
    expense.actual_lines.map((l) => ({ id: l.id, allowed: String(l.amount), note: "" })),
  );
  const [settlement, setSettlement] = useState("payroll");
  const [perPay, setPerPay] = useState("");
  const [payrollDate, setPayrollDate] = useState(todayPH());
  const [note, setNote] = useState("");

  const allowed = rows.reduce((sum, r) => sum + Number(r.allowed || 0), 0);
  const released = Number(expense.released_amount || 0);
  const short = expense.kind === "budget" ? Math.max(released - allowed, 0) : 0;
  const reimburse = expense.kind === "budget" ? Math.max(allowed - released, 0) : allowed;
  const byId = useMemo(() => Object.fromEntries(expense.actual_lines.map((l) => [l.id, l])), [expense]);

  const set = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Review</h3>
      <p className="text-xs text-fg-subtle">
        Allow each expense in full, part, or not at all (0). Give a reason for anything not fully
        allowed -- e.g. not valid, unauthorized, or no proper receipt.
      </p>
      {rows.map((r) => {
        const line = byId[r.id];
        const partial = Number(r.allowed || 0) < Number(line.amount);
        return (
          <div key={r.id} className="rounded-xl border border-border p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {line.category_label} · {peso(line.amount)}
                </p>
                <p className="text-xs text-fg-muted">{line.description || "—"}</p>
              </div>
              {line.receipt_url ? (
                <a href={line.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  View receipt
                </a>
              ) : (
                <span className="text-xs text-warning">No receipt</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[130px_1fr]">
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  max={line.amount}
                  step="0.01"
                  value={r.allowed}
                  onChange={(e) => set(r.id, "allowed", e.target.value)}
                  className={inputClass}
                  title="Allowed amount"
                />
                <button type="button" onClick={() => set(r.id, "allowed", "0")} className="rounded-lg border border-border px-2 text-xs text-danger" title="Disallow">
                  0
                </button>
              </div>
              <input
                value={r.note}
                onChange={(e) => set(r.id, "note", e.target.value)}
                placeholder={partial ? "Reason (required)" : "Note (optional)"}
                className={`${inputClass} ${partial && !r.note.trim() ? "border-danger" : ""}`}
              />
            </div>
          </div>
        );
      })}

      <div className="rounded-xl bg-surface-hover p-3">
        <p>
          Allowed <strong>{peso(allowed)}</strong>
          {expense.kind === "budget" && <> of {peso(released)} released</>}
        </p>
        {short > 0 && (
          <div className="mt-2 space-y-2">
            <p className="font-medium text-warning">Unspent {peso(short)} -- the driver owes this.</p>
            <label className="flex items-center gap-2">
              <input type="radio" checked={settlement === "returned_cash"} onChange={() => setSettlement("returned_cash")} />
              Returned in cash (no deduction)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={settlement === "payroll"} onChange={() => setSettlement("payroll")} />
              Deduct from payroll
            </label>
            {settlement === "payroll" && (
              <label className="ml-6 block text-xs text-fg-muted">
                Per pay (blank = all at once in the next payroll)
                <input type="number" min="0" step="0.01" value={perPay} onChange={(e) => setPerPay(e.target.value)} className={`${inputClass} max-w-40`} />
              </label>
            )}
          </div>
        )}
        {reimburse > 0 && (
          <div className="mt-2">
            <p className="font-medium text-success">Reimburse {peso(reimburse)} with payroll.</p>
            <label className="mt-1 block text-xs text-fg-muted">
              Pay with the payroll covering
              <input type="date" value={payrollDate} onChange={(e) => setPayrollDate(e.target.value)} className={`${inputClass} max-w-48`} />
            </label>
          </div>
        )}
        {short === 0 && reimburse === 0 && <p className="mt-1 text-fg-muted">Nothing to settle.</p>}
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Overall note (optional)" className={inputClass} />
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            () =>
              reviewTripExpense(expense.id, {
                lines: rows.map((r) => ({
                  id: r.id,
                  allowed_amount: Number(r.allowed || 0),
                  review_note: r.note,
                })),
                short_settlement: short > 0 ? settlement : null,
                deduction_per_pay: short > 0 && settlement === "payroll" && perPay ? Number(perPay) : null,
                payroll_date: reimburse > 0 ? payrollDate : null,
                note,
              }),
            "Reviewed and settled.",
          )
        }
        className={`${btn} bg-success text-success-foreground`}
      >
        Approve & settle
      </button>
    </section>
  );
}
