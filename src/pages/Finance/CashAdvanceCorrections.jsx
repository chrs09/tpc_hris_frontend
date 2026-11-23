import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import StatusPill from "../../components/ui/statusPill/StatusPill";
import { TABLE_HEAD, TABLE_ROW, TABLE_WRAP } from "../../components/ui/table/tableStyles";
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";
import { matchesSearch } from "../../utils/search";
import { getCashAdvanceTransactions } from "../../api/cashAdvanceRequests";
import {
  approveCaCorrection,
  cancelCaCorrection,
  getCaCorrections,
  rejectCaCorrection,
  requestCaAdjustment,
  requestCaReversal,
  searchCaForCorrection,
} from "../../api/cashAdvanceCorrections";

// Finance -> CA Corrections (same idea as Trip Corrections): adjusting
// what a cash advance owes, or reversing a deduction never taken from
// pay, is filed here with a reason and only changes the balance once an
// approver approves it. The person who filed can't approve their own.

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n) => `${n < 0 ? "−" : "+"}${peso(Math.abs(n))}`;
const STATUS_TONE = { pending: "warning", approved: "success", rejected: "danger", cancelled: "neutral" };
const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };
const errorText = (err, fallback) => err?.response?.data?.detail || fallback;
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function CashAdvanceCorrections() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "history" ? "history" : "pending";
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getCaCorrections(view));
    } catch (err) {
      toast.error(errorText(err, "Couldn't load correction requests."));
      setData({ items: [], can_approve: false, can_request: false });
    }
  }, [view]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const items = useMemo(
    () =>
      (data?.items || []).filter(
        (c) =>
          (kindFilter === "all" || c.kind === kindFilter) &&
          matchesSearch(search, c.employee_name, c.reference_no, c.reason, c.requested_by, c.decided_by),
      ),
    [data, search, kindFilter],
  );

  const act = async (c, action) => {
    let note;
    if (action === "approve") {
      note = await promptDialog(
        `Approve this ${c.kind}? ${describe(c)} for ${c.employee_name}. Note (optional):`,
        "",
      );
      if (note === null) return;
    } else if (action === "reject") {
      note = await promptDialog("Why is it rejected?", "");
      if (note === null) return;
      if (!note.trim()) return toast.error("Give the reason for rejecting it.");
    } else if (!(await confirmDialog("Cancel this request?"))) {
      return;
    }
    setBusy(`${action}-${c.id}`);
    try {
      if (action === "approve") await approveCaCorrection(c.id, note);
      else if (action === "reject") await rejectCaCorrection(c.id, note);
      else await cancelCaCorrection(c.id);
      toast.success(
        action === "approve" ? "Approved. The balance is updated." : action === "reject" ? "Rejected." : "Cancelled.",
      );
      await load();
    } catch (err) {
      toast.error(errorText(err, "Couldn't update the request."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Finance" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">CA Corrections</h1>
          <p className="mt-1 max-w-3xl text-sm text-fg-subtle">
            Cash advance adjustments and deduction reversals. File one with a reason; the balance only changes once
            it&apos;s approved. The person who filed it can&apos;t approve it.
          </p>
        </div>
        {data?.can_request && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            + New request
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {[
              ["pending", "Requests"],
              ["history", "History"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setParams(key === "history" ? { view: "history" } : {})}
                className={`rounded-md px-3 py-1.5 ${view === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"}`}
              >
                {label}
                {key === "pending" && view === "pending" && data ? ` (${data.items.length})` : ""}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {[
              ["all", "All"],
              ["adjustment", "Adjustments"],
              ["reversal", "Reversals"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setKindFilter(key)}
                className={`rounded-md px-3 py-1.5 ${kindFilter === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search employee, CA no., reason, person..." />
      </div>

      <div className={TABLE_WRAP}>
        <table className="w-full min-w-[1000px] text-sm">
          <thead className={TABLE_HEAD}>
            <tr>
              <th className="px-4 py-3 text-left">Cash advance</th>
              <th className="px-4 py-3 text-left">Request</th>
              <th className="px-4 py-3 text-left">Balance</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Filed</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-fg-subtle">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-fg-subtle">
                  {view === "pending" ? "Nothing waiting for approval." : "No corrections yet."}
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className={`${TABLE_ROW} align-top`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{c.employee_name || "—"}</p>
                    <p className="text-xs text-fg-subtle">{c.reference_no || `CA #${c.cash_advance_request_id}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{c.kind === "adjustment" ? "Adjustment" : "Reversal"}</p>
                    <p className="text-xs text-fg-muted">{describe(c)}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.balance_before != null ? (
                      <>
                        <p className="text-fg">
                          {peso(c.balance_before)} → <strong>{peso(c.balance_after)}</strong>
                        </p>
                        <p className="text-[11px] text-fg-subtle">when filed</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-fg-muted">
                    <p className="whitespace-pre-wrap">{c.reason}</p>
                    {c.decision_note && (
                      <p className="mt-1 text-xs text-fg-subtle">
                        {c.status === "rejected" ? "Rejected" : "Note"}: {c.decision_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    <p>{c.requested_by || "—"}</p>
                    <p className="text-fg-subtle">{c.requested_at}</p>
                    {c.decided_by && c.status !== "pending" && (
                      <p className="mt-1 text-fg-subtle">
                        {STATUS_LABEL[c.status]} by {c.decided_by}
                        <br />
                        {c.decided_at}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {c.can_approve && (
                        <>
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => act(c, "approve")}
                            className="rounded-lg bg-success px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {busy === `approve-${c.id}` ? "Saving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => act(c, "reject")}
                            className="rounded-lg border border-danger/50 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {c.can_cancel && (
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => act(c, "cancel")}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                      {c.status === "pending" && c.mine && !c.can_approve && (
                        <span className="text-[11px] text-fg-subtle">Waiting for someone else to approve</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewRequestModal
          onClose={() => setShowNew(false)}
          onSaved={async () => {
            setShowNew(false);
            if (view !== "pending") setParams({});
            else await load();
          }}
        />
      )}
    </div>
  );
}

function describe(c) {
  if (c.kind === "adjustment") {
    return `Owed ${signed(c.change)}${c.owed_before != null ? ` (${peso(c.owed_before)} → ${peso(c.owed_before + c.change)})` : ""}`;
  }
  return `Add back ${peso(c.amount)}${c.cutoff_period ? ` · cutoff ${c.cutoff_period.replace("_", " to ")}` : " · manual deduction"}`;
}

function NewRequestModal({ onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [kind, setKind] = useState("adjustment");
  const [actual, setActual] = useState("");
  const [deductions, setDeductions] = useState(null);
  const [logId, setLogId] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (picked) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchCaForCorrection(query)
        .then((rows) => !cancelled && setResults(rows))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, picked]);

  useEffect(() => {
    if (!picked || kind !== "reversal") return undefined;
    let cancelled = false;
    setDeductions(null);
    getCashAdvanceTransactions(picked.id)
      .then((rows) =>
        !cancelled &&
        setDeductions(
          (rows || []).filter(
            (t) => (t.entry_type || "deduction") === "deduction" && t.amount > 0 && !t.reversed,
          ),
        ),
      )
      .catch(() => !cancelled && setDeductions([]));
    return () => {
      cancelled = true;
    };
  }, [picked, kind]);

  const pick = (ca) => {
    setPicked(ca);
    setActual(String(ca.effective_amount));
    setLogId(null);
  };

  const change = picked && actual !== "" ? Math.round((Number(actual) - picked.effective_amount) * 100) / 100 : 0;
  const chosen = (deductions || []).find((d) => d.id === logId);

  const submit = async (e) => {
    e.preventDefault();
    if (!picked) return toast.error("Pick the cash advance.");
    if (!reason.trim()) return toast.error("Give the reason.");
    setSaving(true);
    try {
      if (kind === "adjustment") {
        if (!change) {
          setSaving(false);
          return toast.error("Enter the corrected amount owed.");
        }
        await requestCaAdjustment(picked.id, change, reason.trim());
      } else {
        if (!logId) {
          setSaving(false);
          return toast.error("Pick the deduction to reverse.");
        }
        await requestCaReversal(picked.id, logId, reason.trim());
      }
      toast.success("Sent for approval.");
      await onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't send the request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-fg">New correction request</h2>
          <p className="text-xs text-fg-subtle">Nothing changes until it&apos;s approved.</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-1 text-xs font-medium text-fg-muted">Cash advance</p>
            {picked ? (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-fg">
                    {picked.employee_name} · {picked.reference_no || `CA #${picked.id}`}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    Owed {peso(picked.effective_amount)} · deducted {peso(picked.total_deducted)} · balance{" "}
                    {peso(picked.remaining_balance)}
                  </p>
                </div>
                <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold text-primary hover:underline">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  id="cac-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search employee or CA number..."
                  className={inputCls}
                  autoFocus
                />
                <ul className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {results.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-fg-subtle">No approved cash advances match.</li>
                  ) : (
                    results.map((ca) => (
                      <li key={ca.id}>
                        <button
                          type="button"
                          onClick={() => pick(ca)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-hover"
                        >
                          <span>
                            <span className="font-medium text-fg">{ca.employee_name}</span>{" "}
                            <span className="text-xs text-fg-subtle">{ca.reference_no || `CA #${ca.id}`}</span>
                          </span>
                          <span className="text-xs tabular-nums text-fg-muted">
                            {ca.is_fully_paid ? "Fully paid" : `Bal ${peso(ca.remaining_balance)}`}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>

          {picked && (
            <>
              <div className="flex rounded-lg border border-border p-0.5 text-sm">
                {[
                  ["adjustment", "Adjust amount owed"],
                  ["reversal", "Reverse a deduction"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKind(key)}
                    className={`flex-1 rounded-md px-3 py-1.5 ${kind === key ? "bg-primary/10 font-semibold text-primary" : "text-fg-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {kind === "adjustment" ? (
                <div>
                  <label htmlFor="cac-actual" className="mb-1 block text-xs font-medium text-fg-muted">
                    Correct amount owed (₱)
                  </label>
                  <input
                    id="cac-actual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    className={inputCls}
                  />
                  {change !== 0 && (
                    <p className="mt-2 rounded-lg bg-surface-hover px-3 py-2 text-xs text-fg-muted">
                      Adjustment <strong>{signed(change)}</strong> · balance would become{" "}
                      <strong>{peso(picked.remaining_balance + change)}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-xs font-medium text-fg-muted">Deduction to add back</p>
                  {deductions === null ? (
                    <p className="text-sm text-fg-subtle">Loading...</p>
                  ) : deductions.length === 0 ? (
                    <p className="text-sm text-fg-subtle">No deductions that can be reversed.</p>
                  ) : (
                    <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                      {deductions.map((d) => (
                        <li key={d.id}>
                          <label
                            htmlFor={`cac-log-${d.id}`}
                            className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                              d.reversal_pending ? "cursor-default opacity-60" : "hover:bg-surface-hover"
                            }`}
                          >
                            <input
                              id={`cac-log-${d.id}`}
                              type="radio"
                              name="cac-log"
                              disabled={d.reversal_pending}
                              checked={logId === d.id}
                              onChange={() => setLogId(d.id)}
                            />
                            <span className="flex-1">
                              <span className="font-medium tabular-nums text-fg">{peso(d.amount)}</span>{" "}
                              <span className="text-xs text-fg-subtle">
                                {d.payroll_cutoff_period
                                  ? `Payroll ${d.payroll_cutoff_period.replace("_", " to ")}`
                                  : `Manual · ${new Date(d.recorded_at).toLocaleDateString("en-PH")}`}
                              </span>
                            </span>
                            {d.reversal_pending && <span className="text-[11px] font-semibold text-warning">Pending</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  {chosen && (
                    <p className="mt-2 rounded-lg bg-surface-hover px-3 py-2 text-xs text-fg-muted">
                      Balance would become <strong>{peso(picked.remaining_balance + chosen.amount)}</strong>. Use this
                      only if it was never taken from their pay.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="cac-reason" className="mb-1 block text-xs font-medium text-fg-muted">
                  Reason
                </label>
                <textarea
                  id="cac-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                  placeholder={
                    kind === "adjustment" ? "e.g. Only ₱700 was actually released" : "e.g. Payroll posted it but it wasn't deducted"
                  }
                  className={inputCls}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !picked}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Sending..." : "Send for approval"}
          </button>
        </div>
      </form>
    </div>
  );
}
