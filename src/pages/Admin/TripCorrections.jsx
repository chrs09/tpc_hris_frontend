import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import { getStores } from "../../api/adminTripManagement/stores";
import {
  approveTripCorrection,
  cancelTripCorrection,
  getTripCorrections,
  getTripForCorrection,
  rejectTripCorrection,
  requestTripCorrection,
  searchCorrectableTrips,
} from "../../api/tripCorrections";

// Trip Management -> Correction Requests / Correction History.
// Coordinators / operations request a change to a finished trip; Finance
// approves (the trip changes, the old values are kept here) or rejects.
// Allowed until Finance clears the trip and while its payroll isn't locked.

const getErrorMessage = (error) =>
  error?.response?.data?.detail || error?.message || "Something went wrong.";
const inputStyles =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};
const STATUS_LABELS = {
  pending: "Waiting for Finance",
  approved: "Approved · applied",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
const TRIP_STATUS = {
  PENDING_MANUAL_APPROVAL: "Manual entry, waiting",
  PENDING_APPROVAL: "Delivered",
  PENDING_OFFICE_REVIEW: "Submitted to Office",
  PENDING_FINANCE_REVIEW: "Verified",
};

export default function TripCorrections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "history" ? "history" : "requests";
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setData(await getTripCorrections({ view, q: query }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [view, query]);

  useEffect(() => {
    let cancelled = false;
    getTripCorrections({ view, q: query })
      .then((res) => !cancelled && setData(res))
      .catch((error) => !cancelled && toast.error(getErrorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [view, query]);

  const rows = data?.corrections || [];
  const me = Number(localStorage.getItem("user_id"));

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fg sm:text-xl">
            {view === "history" ? "Correction History" : "Correction Requests"}
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Request a change to a finished trip. Finance approves it before the trip changes,
            and the original values are kept here. Allowed until Finance clears the trip.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex rounded-xl border border-border p-0.5 text-sm">
            {[
              ["requests", `Requests${data ? ` (${data.pending_count})` : ""}`],
              ["history", "History"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSearchParams(key === "history" ? { view: "history" } : {})}
                className={`rounded-lg px-4 py-1.5 font-medium ${
                  view === key ? "bg-primary text-primary-foreground" : "text-fg-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              id="corrections-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Trip code or shipment"
              className={`${inputStyles} pl-9`}
            />
          </div>
          {data?.can_request && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              <Plus size={15} /> New Correction
            </button>
          )}
        </div>
      </div>

      {!data ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-subtle">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          {view === "history" ? "No decided corrections yet." : "No corrections waiting for Finance."}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <CorrectionCard
              key={c.id}
              correction={c}
              canApprove={data.can_approve}
              canCancel={c.status === "pending" && c.requested_by_user_id === me}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {creating && (
        <NewCorrectionModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setSearchParams({});
            load();
          }}
        />
      )}
    </div>
  );
}

function CorrectionCard({ correction: c, canApprove, canCancel, onChanged }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (fn, okMessage) => {
    try {
      setBusy(true);
      const res = await fn();
      toast.success(res?.message || okMessage);
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-fg">
            {c.trip_code || `Trip #${c.trip_id}`}{" "}
            <span className="font-normal text-fg-muted">· {c.ticket_no || "-"}</span>
          </p>
          <p className="text-xs text-fg-subtle">
            {c.driver_name || "-"} · trip is {TRIP_STATUS[c.trip_status] || c.trip_status}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>
          {STATUS_LABELS[c.status] || c.status}
        </span>
      </div>

      <p className="text-sm text-fg">
        <span className="text-fg-subtle">Reason: </span>
        {c.reason}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Field</th>
              <th className="px-3 py-2 text-left font-medium">Original</th>
              <th className="px-3 py-2 text-left font-medium">Corrected to</th>
            </tr>
          </thead>
          <tbody>
            {c.changes.map((ch) => (
              <tr key={ch.field} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium text-fg">{ch.label}</td>
                <td className="px-3 py-2 text-fg-muted">{ch.from}</td>
                <td className="px-3 py-2 font-semibold text-fg">{ch.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-fg-subtle">
        Requested by {c.requested_by || "-"} · {c.requested_at}
        {c.decided_at && ` · ${c.status === "cancelled" ? "Cancelled" : "Decided"} by ${c.decided_by || "-"} · ${c.decided_at}`}
        {c.decision_note && ` · "${c.decision_note}"`}
      </p>

      {c.status === "pending" && (canApprove || canCancel) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {canApprove && (
            <>
              <input
                id={`decision-note-${c.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (required to reject)"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => approveTripCorrection(c.id, note.trim()), "Approved.")}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                Approve &amp; apply
              </button>
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() => act(() => rejectTripCorrection(c.id, note.trim()), "Rejected.")}
                className="rounded-xl border border-danger/50 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => cancelTripCorrection(c.id), "Cancelled.")}
              className="rounded-xl border border-border px-4 py-2 text-sm text-fg-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel request
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const Field = ({ label, htmlFor, children }) => (
  <div className="min-w-0">
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-fg-subtle">{label}</label>
    {children}
  </div>
);

function NewCorrectionModal({ onClose, onSaved }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loaded, setLoaded] = useState(null); // {trip, current, options, pending_correction_id}
  const [form, setForm] = useState(null);
  const [stores, setStores] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStores()
      .then((res) => setStores(Array.isArray(res.data) ? res.data : res.data?.items || []))
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(() => {
      searchCorrectableTrips(q.trim())
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const pick = async (trip) => {
    try {
      const data = await getTripForCorrection(trip.id);
      setLoaded(data);
      setForm({
        ...data.current,
        shipment_text: data.current.shipment_numbers.join(", "),
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const storeOptions = stores.map((s) => ({ id: s.id, label: s.name }));
  const opts = loaded?.options;
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    try {
      setSaving(true);
      const { shipment_text: shipmentText, ...values } = form;
      const res = await requestTripCorrection({
        tripId: loaded.trip.id,
        reason: reason.trim(),
        changes: {
          ...values,
          shipment_numbers: shipmentText.split(/[\s,]+/).filter(Boolean),
        },
      });
      toast.success(res.message);
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">New Correction</h2>
            <p className="text-xs text-fg-subtle">
              {loaded ? `${loaded.trip.trip_code || `Trip #${loaded.trip.id}`} · ${loaded.trip.ticket_no || ""}` : "Find the trip to correct"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!loaded ? (
            <>
              <Field label="Trip code or shipment number" htmlFor="correction-trip-search">
                <input
                  id="correction-trip-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. 202611-00095 or 32176628"
                  className={inputStyles}
                />
              </Field>
              <p className="text-xs text-fg-subtle">
                Only finished trips not yet cleared by Finance are listed.
              </p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {results.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-fg-subtle">
                    {q.trim().length < 3 ? "Type at least 3 characters." : "No matching trip can be corrected."}
                  </li>
                ) : (
                  results.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => pick(t)} className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover">
                        <span className="font-medium">{t.trip_code || `#${t.id}`}</span> · {t.ticket_no}
                        <span className="block text-xs text-fg-subtle">
                          {t.driver_name || "-"} · {t.trip_date || "-"} · {TRIP_STATUS[t.status] || t.status}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          ) : loaded.pending_correction_id ? (
            <p className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
              This trip already has a correction waiting for Finance. Cancel that one first or wait for the decision.
            </p>
          ) : (
            <>
              <p className="text-xs text-fg-subtle">
                Change only what&apos;s wrong. The trip stays as it is until Finance approves.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Start (checkout)" htmlFor="corr-start">
                  <input id="corr-start" type="datetime-local" value={form.start_time || ""} onChange={(e) => set("start_time", e.target.value)} className={inputStyles} />
                </Field>
                <Field label="End (check-in)" htmlFor="corr-end">
                  <input id="corr-end" type="datetime-local" value={form.end_time || ""} onChange={(e) => set("end_time", e.target.value)} className={inputStyles} />
                </Field>
                <Field label="Shipment numbers (comma-separated)" htmlFor="corr-shipments">
                  <input id="corr-shipments" value={form.shipment_text} onChange={(e) => set("shipment_text", e.target.value)} className={inputStyles} />
                </Field>
                <Field label="Driver">
                  <SearchSelect
                    value={opts.drivers.find((d) => d.id === form.driver_id) || null}
                    options={opts.drivers}
                    onChange={(d) => set("driver_id", d ? d.id : form.driver_id)}
                    getOptionLabel={(d) => d?.label || ""}
                    getOptionValue={(d) => String(d?.id)}
                  />
                </Field>
                <Field label="Vehicle">
                  <SearchSelect
                    value={opts.vehicles.find((v) => v.id === form.vehicle_unit_id) || null}
                    options={opts.vehicles}
                    onChange={(v) => set("vehicle_unit_id", v ? v.id : form.vehicle_unit_id)}
                    getOptionLabel={(v) => v?.label || ""}
                    getOptionValue={(v) => String(v?.id)}
                  />
                </Field>
                <Field label="Start point">
                  <SearchSelect
                    value={storeOptions.find((s) => s.id === form.origin_store_id) || null}
                    options={storeOptions}
                    onChange={(s) => set("origin_store_id", s ? s.id : form.origin_store_id)}
                    getOptionLabel={(s) => s?.label || ""}
                    getOptionValue={(s) => String(s?.id)}
                  />
                </Field>
              </div>

              <Field label={`Destinations (${form.destination_store_ids.length} stop${form.destination_store_ids.length === 1 ? "" : "s"}, in order)`}>
                <div className="space-y-2">
                  {form.destination_store_ids.map((sid, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-fg-subtle">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <SearchSelect
                          value={storeOptions.find((s) => s.id === sid) || null}
                          options={storeOptions}
                          onChange={(s) =>
                            s &&
                            set(
                              "destination_store_ids",
                              form.destination_store_ids.map((x, j) => (j === i ? s.id : x)),
                            )
                          }
                          getOptionLabel={(s) => s?.label || ""}
                          getOptionValue={(s) => String(s?.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label="Helpers">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {form.helper_ids.map((hid) => (
                      <span key={hid} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                        {opts.helpers.find((h) => h.id === hid)?.label || `#${hid}`}
                        <button
                          type="button"
                          aria-label="Remove helper"
                          onClick={() => set("helper_ids", form.helper_ids.filter((x) => x !== hid))}
                          className="text-fg-muted hover:text-danger"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {form.helper_ids.length === 0 && <span className="text-xs text-fg-subtle">No helpers</span>}
                  </div>
                  {form.helper_ids.length < 3 && (
                    <SearchSelect
                      value={null}
                      options={opts.helpers.filter((h) => !form.helper_ids.includes(h.id))}
                      onChange={(h) => h && set("helper_ids", [...form.helper_ids, h.id])}
                      placeholder="Add helper"
                      getOptionLabel={(h) => h?.label || ""}
                      getOptionValue={(h) => String(h?.id)}
                    />
                  )}
                </div>
              </Field>

              <Field label="Reason for the correction" htmlFor="corr-reason">
                <textarea
                  id="corr-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                  placeholder="e.g. Wrong driver encoded; Juan drove this trip"
                  className={`${inputStyles} min-h-[72px]`}
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-border px-5 py-3">
          {loaded ? (
            <button type="button" onClick={() => { setLoaded(null); setForm(null); }} className="rounded-xl border border-border px-4 py-2 text-sm">
              Pick another trip
            </button>
          ) : (
            <span />
          )}
          {loaded && !loaded.pending_correction_id && (
            <button
              type="button"
              onClick={submit}
              disabled={saving || !reason.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Sending..." : "Send to Finance"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
