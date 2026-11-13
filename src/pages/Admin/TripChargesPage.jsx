import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SearchSelect from "../../components/SearchSelect";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import useModuleAccess from "../../hooks/useModuleAccess";
import {
  addTripChargeAttachment,
  approveTripCharge,
  cancelTripCharge,
  createTripCharge,
  getChargeEmployees,
  getTripCharges,
  lookupTrips,
  reviseTripCharge,
  saveTripChargeExplanation,
  recordTripChargeNotice,
  updateTripCharge,
} from "../../api/tripCharges";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

const EDIT_ROLES = ["coordinator_admin", "office_admin"];

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUS_LABELS = {
  recorded: "Recorded",
  for_explanation: "For Explanation",
  approved: "Approved",
  settled: "Settled",
  cancelled: "Cancelled",
};

const STATUS_STYLES = {
  recorded: "bg-surface-active text-fg-muted",
  for_explanation: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  settled: "bg-primary/15 text-primary",
  cancelled: "bg-danger/10 text-danger",
};

const INSURANCE_LABELS = {
  pending: "Waiting for result",
  covered: "Covered by insurance",
  denied: "Denied",
  not_claimed: "Not claimed",
};

const INVESTIGATION_LABELS = {
  pending: "Ongoing",
  negligent: "Negligent",
  not_negligent: "Not negligent",
};

const ACTION_LABELS = {
  recorded: "Recorded",
  edited: "Edited",
  notice_recorded: "Notice given",
  explanation_saved: "Explanation saved",
  approved: "Approved",
  revised: "Revised",
  cancelled: "Cancelled",
};

const round2 = (value) => Math.round(value * 100) / 100;

// Same rules as suggested_chargeable in app/api/admin/trip_charges.py; null
// means it can't be told yet.
const suggestedChargeable = (form) => {
  const total = Number(form.total_amount || 0);
  if (form.charge_type === "shortage") return round2(total);
  if (form.insurance_status === "covered") {
    return round2(Math.min(Number(form.participation_amount || 0), total));
  }
  if (form.insurance_status === "denied") return round2(total);
  if (
    form.insurance_status === "not_claimed" &&
    form.investigation_result !== "pending"
  ) {
    return form.investigation_result === "negligent" ? round2(total) : 0;
  }
  return null;
};

const emptyForm = (chargeType) => ({
  charge_type: chargeType,
  trip: null,
  incident_date: "",
  description: "",
  total_amount: "",
  shipment_no: "",
  report_reference: "",
  report_date: "",
  item: "",
  quantity: "",
  unit_cost: "",
  insurance_status: "pending",
  insurance_reference: "",
  // Editable per case: the usual amount from the ticket.
  participation_amount: "5000",
  investigation_result: "pending",
  investigation_notes: "",
  chargeable_amount: "",
  chargeable_reason: "",
  allocations: [],
});

const formFromCharge = (charge) => ({
  charge_type: charge.charge_type,
  trip: charge.trip,
  incident_date: charge.incident_date || "",
  description: charge.description || "",
  total_amount: String(charge.total_amount ?? ""),
  shipment_no: charge.shipment_no || "",
  report_reference: charge.report_reference || "",
  report_date: charge.report_date || "",
  item: charge.item || "",
  quantity: charge.quantity ?? "",
  unit_cost: charge.unit_cost ?? "",
  insurance_status: charge.insurance_status || "pending",
  insurance_reference: charge.insurance_reference || "",
  participation_amount: charge.participation_amount ?? "5000",
  investigation_result: charge.investigation_result || "pending",
  investigation_notes: charge.investigation_notes || "",
  chargeable_amount: String(charge.chargeable_amount ?? ""),
  chargeable_reason: charge.chargeable_reason || "",
  allocations: charge.allocations
    .filter((a) => a.amount > 0 || a.deducted === 0)
    .map((a) => ({
      employee_id: a.employee_id,
      name: a.employee_name,
      amount: String(a.amount),
      deduction_per_pay: a.deduction_per_pay ?? "",
    })),
});

const toPayload = (form) => ({
  charge_type: form.charge_type,
  trip_id: form.trip?.id,
  incident_date: form.incident_date,
  description: form.description,
  total_amount: Number(form.total_amount || 0),
  shipment_no: form.shipment_no || null,
  report_reference: form.report_reference || null,
  report_date: form.report_date || null,
  item: form.item || null,
  quantity: form.quantity === "" ? null : Number(form.quantity),
  unit_cost: form.unit_cost === "" ? null : Number(form.unit_cost),
  insurance_status: form.insurance_status,
  insurance_reference: form.insurance_reference || null,
  participation_amount:
    form.participation_amount === "" ? null : Number(form.participation_amount),
  investigation_result: form.investigation_result,
  investigation_notes: form.investigation_notes || null,
  chargeable_amount: Number(form.chargeable_amount || 0),
  chargeable_reason: form.chargeable_reason || null,
  allocations: form.allocations.map((a) => ({
    employee_id: a.employee_id,
    amount: Number(a.amount || 0),
    deduction_per_pay:
      a.deduction_per_pay === "" ? null : Number(a.deduction_per_pay),
  })),
});

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-fg-muted">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-fg-subtle">{hint}</span>}
  </label>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-fg-subtle">{label}</span>
    <span className="text-right font-semibold text-fg">{value}</span>
  </div>
);

function TripPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return undefined;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await lookupTrips(q);
        if (!stale) {
          setResults(rows);
          setSearched(true);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3">
        <div className="min-w-0 text-sm text-fg">
          <p className="font-semibold">
            {value.trip_code || `Trip #${value.id}`} · {value.date || "No date"}
          </p>
          <p className="break-words text-xs text-fg-subtle">
            {value.shipment_no || "No shipment no."}
            {value.vehicle ? ` · ${value.vehicle}` : ""}
          </p>
          <p className="text-xs text-fg-subtle">
            {value.crew.map((c) => `${c.name} (${c.role})`).join(", ") || "No crew"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-xs font-semibold text-primary"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        className={inputStyles}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search shipment no. or trip code"
      />
      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border">
          {results.map((trip) => (
            <button
              type="button"
              key={trip.id}
              onClick={() => onChange(trip)}
              className="block w-full border-b border-border p-3 text-left text-sm text-fg last:border-b-0 hover:bg-surface-hover"
            >
              <span className="font-semibold">
                {trip.trip_code || `Trip #${trip.id}`} · {trip.date || "No date"}
              </span>
              <span className="block break-words text-xs text-fg-subtle">
                {trip.shipment_no || "No shipment no."} ·{" "}
                {trip.crew.map((c) => c.name).join(", ") || "No crew"}
              </span>
            </button>
          ))}
          {searched && !results.length && (
            <p className="p-3 text-sm text-fg-subtle">No trips found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Add, edit, or (revising = true) change an approved charge.
function ChargeForm({ initial, charge, revising, employees, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  // Follows the rule until someone types their own amount.
  const [chargeTouched, setChargeTouched] = useState(Boolean(charge));

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isShortage = form.charge_type === "shortage";
  const suggested = suggestedChargeable(form);

  useEffect(() => {
    if (!chargeTouched && suggested !== null) {
      setForm((prev) => ({ ...prev, chargeable_amount: String(suggested) }));
    }
  }, [suggested, chargeTouched]);

  const chargeable = Number(form.chargeable_amount || 0);
  const differsFromRule = suggested !== null && round2(chargeable) !== suggested;
  const sharesTotal = round2(
    form.allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0),
  );

  const setQuantityOrCost = (field, value) =>
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (next.quantity !== "" && next.unit_cost !== "") {
        next.total_amount = String(
          round2(Number(next.quantity) * Number(next.unit_cost)),
        );
      }
      return next;
    });

  const pickTrip = (trip) => {
    setForm((prev) => ({
      ...prev,
      trip,
      // Default: the driver pays all of it. Split or change below.
      allocations:
        trip && !prev.allocations.length
          ? trip.crew
              .filter((c) => c.role === "Driver")
              .map((c) => ({
                employee_id: c.employee_id,
                name: c.name,
                amount: "",
                deduction_per_pay: "",
              }))
          : prev.allocations,
      shipment_no:
        !prev.shipment_no && trip?.shipment_no && !trip.shipment_no.includes(",")
          ? trip.shipment_no
          : prev.shipment_no,
    }));
  };

  const splitEqually = (people) => {
    if (!people.length) return;
    const share = Math.floor((chargeable * 100) / people.length) / 100;
    const last = round2(chargeable - share * (people.length - 1));
    const current = new Map(form.allocations.map((a) => [a.employee_id, a]));
    set(
      "allocations",
      people.map((p, index) => ({
        employee_id: p.employee_id,
        name: p.name,
        amount: String(index === people.length - 1 ? last : share),
        deduction_per_pay: current.get(p.employee_id)?.deduction_per_pay ?? "",
      })),
    );
  };

  const addPerson = (employee) => {
    if (!employee || form.allocations.some((a) => a.employee_id === employee.id)) return;
    set("allocations", [
      ...form.allocations,
      {
        employee_id: employee.id,
        name: employee.label,
        amount: "",
        deduction_per_pay: "",
      },
    ]);
  };

  const setShare = (employeeId, field, value) =>
    set(
      "allocations",
      form.allocations.map((a) =>
        a.employee_id === employeeId ? { ...a, [field]: value } : a,
      ),
    );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.trip) return toast.error("Choose the trip.");
    if (!form.incident_date) return toast.error("Enter the date.");
    if (Number(form.total_amount || 0) <= 0) {
      return toast.error(isShortage ? "Enter the shortage amount." : "Enter the total damage.");
    }
    if (revising && !reason.trim()) return toast.error("Give a reason for the revision.");
    setSaving(true);
    try {
      const payload = toPayload(form);
      let saved;
      if (revising) {
        saved = await reviseTripCharge(charge.id, { ...payload, reason });
      } else if (charge) {
        saved = await updateTripCharge(charge.id, payload);
      } else {
        saved = await createTripCharge(payload);
      }
      for (const file of files) {
        saved = await addTripChargeAttachment(saved.id, file);
      }
      toast.success(revising ? "Charge revised." : "Charge saved.");
      onSaved(saved);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const title = revising
    ? "Revise Charge"
    : charge
      ? "Edit Charge"
      : isShortage
        ? "New Shortage"
        : "New Accident";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-lg sm:rounded-3xl"
      >
        <h3 className="text-lg font-bold text-fg">{title}</h3>

        <Field label="Trip">
          {revising ? (
            <p className="text-sm text-fg">
              {form.trip?.trip_code || `Trip #${form.trip?.id}`}
            </p>
          ) : (
            <TripPicker value={form.trip} onChange={pickTrip} />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={isShortage ? "Shortage date" : "Accident date"}>
            <input
              type="date"
              className={inputStyles}
              value={form.incident_date}
              onChange={(e) => set("incident_date", e.target.value)}
            />
          </Field>
          {isShortage && (
            <Field label="Shipment no.">
              <input
                className={inputStyles}
                value={form.shipment_no}
                onChange={(e) => set("shipment_no", e.target.value)}
              />
            </Field>
          )}
        </div>

        {isShortage ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Report reference">
                <input
                  className={inputStyles}
                  value={form.report_reference}
                  onChange={(e) => set("report_reference", e.target.value)}
                />
              </Field>
              <Field label="Date reported">
                <input
                  type="date"
                  className={inputStyles}
                  value={form.report_date}
                  onChange={(e) => set("report_date", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Item">
              <input
                className={inputStyles}
                value={form.item}
                onChange={(e) => set("item", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Cases short">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={inputStyles}
                  value={form.quantity}
                  onChange={(e) => setQuantityOrCost("quantity", e.target.value)}
                />
              </Field>
              <Field label="Cost per case (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputStyles}
                  value={form.unit_cost}
                  onChange={(e) => setQuantityOrCost("unit_cost", e.target.value)}
                />
              </Field>
              <Field label="Shortage amount (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputStyles}
                  value={form.total_amount}
                  onChange={(e) => set("total_amount", e.target.value)}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Total damage (₱)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputStyles}
                value={form.total_amount}
                onChange={(e) => set("total_amount", e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Insurance result">
                <select
                  className={inputStyles}
                  value={form.insurance_status}
                  onChange={(e) => set("insurance_status", e.target.value)}
                >
                  {Object.entries(INSURANCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Claim reference">
                <input
                  className={inputStyles}
                  value={form.insurance_reference}
                  onChange={(e) => set("insurance_reference", e.target.value)}
                />
              </Field>
            </div>
            {form.insurance_status === "covered" && (
              <Field label="Participation amount (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputStyles}
                  value={form.participation_amount}
                  onChange={(e) => set("participation_amount", e.target.value)}
                />
              </Field>
            )}
            <Field label="Investigation result">
              <select
                className={inputStyles}
                value={form.investigation_result}
                onChange={(e) => set("investigation_result", e.target.value)}
              >
                {Object.entries(INVESTIGATION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Investigation notes">
              <textarea
                rows={2}
                className={inputStyles}
                value={form.investigation_notes}
                onChange={(e) => set("investigation_notes", e.target.value)}
              />
            </Field>
          </>
        )}

        <Field label="What happened">
          <textarea
            rows={2}
            className={inputStyles}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <div className="space-y-3 rounded-2xl border border-border p-4">
          <Field
            label="Charged to personnel (₱)"
            hint={
              suggested === null
                ? "Set once the insurance and investigation results are in."
                : `Usual charge: ${peso(suggested)}`
            }
          >
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputStyles}
              value={form.chargeable_amount}
              onChange={(e) => {
                setChargeTouched(true);
                set("chargeable_amount", e.target.value);
              }}
            />
          </Field>
          {differsFromRule && (
            <Field label="Reason for a different amount">
              <input
                className={inputStyles}
                value={form.chargeable_reason}
                onChange={(e) => set("chargeable_reason", e.target.value)}
              />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-xs font-semibold text-fg-muted">Who pays</p>
            {form.trip?.crew?.length > 1 && (
              <button
                type="button"
                onClick={() => splitEqually(form.trip.crew)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg"
              >
                Split equally with crew
              </button>
            )}
            {form.allocations.length === 1 && (
              <button
                type="button"
                onClick={() =>
                  setShare(
                    form.allocations[0].employee_id,
                    "amount",
                    String(chargeable),
                  )
                }
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg"
              >
                Charge all
              </button>
            )}
          </div>

          {form.allocations.map((a) => (
            <div key={a.employee_id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-fg">{a.name}</p>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "allocations",
                      form.allocations.filter((x) => x.employee_id !== a.employee_id),
                    )
                  }
                  className="shrink-0 text-xs font-semibold text-danger"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Share (₱)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputStyles}
                    value={a.amount}
                    onChange={(e) => setShare(a.employee_id, "amount", e.target.value)}
                  />
                </Field>
                <Field label="Per cutoff (₱)" hint="Blank = all at once">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputStyles}
                    value={a.deduction_per_pay}
                    onChange={(e) =>
                      setShare(a.employee_id, "deduction_per_pay", e.target.value)
                    }
                  />
                </Field>
              </div>
            </div>
          ))}

          <SearchSelect
            value={null}
            options={employees}
            onChange={addPerson}
            placeholder="Add someone else"
          />

          {form.allocations.length > 0 && sharesTotal !== round2(chargeable) && (
            <p className="text-xs font-semibold text-danger">
              Shares add up to {peso(sharesTotal)}, not {peso(chargeable)}.
            </p>
          )}
        </div>

        <Field label="Attach files" hint="The report, photos, or the insurer's letter">
          <input
            type="file"
            multiple
            className="block w-full text-sm text-fg"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </Field>

        {revising && (
          <Field label="Reason for the revision">
            <input
              className={inputStyles}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChargeDetails({
  charge,
  canEdit,
  canApprove,
  onClose,
  onChanged,
  onEdit,
  onRevise,
}) {
  const [busy, setBusy] = useState(false);
  const [explanations, setExplanations] = useState({});
  const isShortage = charge.charge_type === "shortage";
  const open = ["recorded", "for_explanation"].includes(charge.status);

  const run = async (action, message) => {
    setBusy(true);
    try {
      const saved = await action();
      toast.success(message);
      onChanged(saved);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const reason = await promptDialog("Why is this charge being cancelled?");
    if (reason === null) return;
    run(() => cancelTripCharge(charge.id, reason), "Charge cancelled.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-fg">
              {isShortage ? "Shortage" : "Accident"} · {peso(charge.total_amount)}
            </h3>
            <p className="text-sm text-fg-subtle">
              {charge.trip?.trip_code || `Trip #${charge.trip_id}`} ·{" "}
              {charge.incident_date}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[charge.display_status]}`}
          >
            {STATUS_LABELS[charge.display_status]}
          </span>
        </div>

        <div className="space-y-1 rounded-2xl border border-border p-4">
          {isShortage ? (
            <>
              <SummaryRow label="Shipment no." value={charge.shipment_no || "--"} />
              <SummaryRow label="Report" value={charge.report_reference || "--"} />
              <SummaryRow label="Date reported" value={charge.report_date || "--"} />
              <SummaryRow
                label="Item"
                value={
                  [charge.quantity != null && `${charge.quantity} case(s)`, charge.item]
                    .filter(Boolean)
                    .join(" · ") || "--"
                }
              />
            </>
          ) : (
            <>
              <SummaryRow label="Vehicle" value={charge.trip?.vehicle || "--"} />
              <SummaryRow
                label="Insurance"
                value={INSURANCE_LABELS[charge.insurance_status] || "--"}
              />
              <SummaryRow label="Claim reference" value={charge.insurance_reference || "--"} />
              <SummaryRow
                label="Investigation"
                value={INVESTIGATION_LABELS[charge.investigation_result] || "--"}
              />
              <SummaryRow label="Insurer pays" value={peso(charge.insurer_amount)} />
              <SummaryRow label="Company pays" value={peso(charge.company_amount)} />
            </>
          )}
          <SummaryRow label="Charged to personnel" value={peso(charge.chargeable_amount)} />
          {charge.chargeable_reason && (
            <p className="pt-1 text-xs text-fg-subtle">Reason: {charge.chargeable_reason}</p>
          )}
          {charge.description && (
            <p className="pt-1 text-sm text-fg">{charge.description}</p>
          )}
          {charge.investigation_notes && (
            <p className="pt-1 text-sm text-fg">{charge.investigation_notes}</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg-muted">Who pays</p>
          {charge.allocations.length === 0 && (
            <p className="text-sm text-fg-subtle">No one yet.</p>
          )}
          {charge.allocations.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-fg">{a.employee_name}</span>
                <span className="text-fg-subtle">
                  {peso(a.amount)} · Paid {peso(a.deducted)} · Left {peso(a.balance)}
                </span>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">
                {a.deduction_per_pay
                  ? `${peso(a.deduction_per_pay)} per cutoff`
                  : "All at once"}
                {" · "}
                {a.notified_at ? "Notice given" : "No notice yet"}
              </p>
              {a.refund_due > 0 && (
                <p className="mt-1 text-xs font-semibold text-danger">
                  Refund due: {peso(a.refund_due)}
                </p>
              )}
              {open && canEdit && a.notified_at ? (
                <div className="mt-2 flex items-start gap-2">
                  <textarea
                    rows={2}
                    className={inputStyles}
                    placeholder="Their explanation"
                    value={explanations[a.id] ?? a.explanation ?? ""}
                    onChange={(e) =>
                      setExplanations((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    disabled={busy || explanations[a.id] === undefined}
                    onClick={() =>
                      run(
                        () => saveTripChargeExplanation(charge.id, a.id, explanations[a.id]),
                        "Explanation saved.",
                      )
                    }
                    className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              ) : (
                a.explanation && (
                  <p className="mt-2 text-sm text-fg">Explanation: {a.explanation}</p>
                )
              )}
            </div>
          ))}
        </div>

        {charge.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {charge.attachments.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
              >
                File {index + 1}
              </a>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs font-semibold text-fg-muted">History</p>
          {charge.history.map((entry, index) => (
            <p key={index} className="text-xs text-fg-subtle">
              {new Date(entry.at).toLocaleString("en-PH")} ·{" "}
              {ACTION_LABELS[entry.action] || entry.action} · {entry.by_name}
              {entry.note ? ` · ${entry.note}` : ""}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg"
          >
            Close
          </button>
          {open && canEdit && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={cancel}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-danger"
              >
                Cancel Charge
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg"
              >
                Edit
              </button>
              {charge.chargeable_amount > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => recordTripChargeNotice(charge.id), "Notice recorded.")}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg"
                >
                  Notice Given
                </button>
              )}
            </>
          )}
          {open && canApprove && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => approveTripCharge(charge.id), "Charge approved.")}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {charge.chargeable_amount > 0 ? "Approve" : "Close with No Charge"}
            </button>
          )}
          {charge.status === "approved" && canApprove && (
            <>
              {charge.allocations.every((a) => a.deducted === 0) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancel}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-danger"
                >
                  Cancel Charge
                </button>
              )}
              <button
                type="button"
                onClick={onRevise}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Revise
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Shortages and accidents on a trip: who pays what, deducted through payroll
// once approved. Can be recorded any time after the trip, since the deduction
// goes to the next open payroll.
export default function TripChargesPage() {
  const { isSuperAdmin, canEdit: canEditKey, canEditModule } = useModuleAccess();
  const canEdit = isSuperAdmin || canEditKey("trip_management.trip_charges", EDIT_ROLES);
  const canApprove = canEditModule("trip_management.trip_charges_approve");

  const [charges, setCharges] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState(null);
  // { initial, charge, revising }
  const [formState, setFormState] = useState(null);

  const load = useCallback(async () => {
    try {
      setCharges(await getTripCharges());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getChargeEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [load]);

  const replaceCharge = (saved) =>
    setCharges((prev) =>
      prev.some((c) => c.id === saved.id)
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev],
    );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return charges.filter((c) => {
      if (typeFilter && c.charge_type !== typeFilter) return false;
      if (statusFilter && c.display_status !== statusFilter) return false;
      if (!q) return true;
      return [
        c.trip?.trip_code,
        c.trip?.shipment_no,
        c.shipment_no,
        ...c.allocations.map((a) => a.employee_name),
      ].some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [charges, typeFilter, statusFilter, search]);

  const viewing = charges.find((c) => c.id === viewingId);

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-fg">Trip Charges</h1>
          <p className="text-sm text-fg-subtle">
            Shortages and accidents, deducted through payroll once approved.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormState({ initial: emptyForm("shortage") })}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              New Shortage
            </button>
            <button
              type="button"
              onClick={() => setFormState({ initial: emptyForm("accident") })}
              className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg"
            >
              New Accident
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className={inputStyles}
          placeholder="Search trip, shipment or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputStyles}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="shortage">Shortages</option>
          <option value="accident">Accidents</option>
        </select>
        <select
          className={inputStyles}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-fg-subtle">
          No charges found.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((charge) => {
            const left = charge.allocations.reduce((sum, a) => sum + a.balance, 0);
            return (
              <button
                type="button"
                key={charge.id}
                onClick={() => setViewingId(charge.id)}
                className="rounded-2xl border border-border bg-surface p-4 text-left hover:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">
                      {charge.charge_type === "shortage" ? "Shortage" : "Accident"} ·{" "}
                      {charge.trip?.trip_code || `Trip #${charge.trip_id}`}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      {charge.incident_date} ·{" "}
                      {charge.allocations.map((a) => a.employee_name).join(", ") ||
                        "No one assigned"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[charge.display_status]}`}
                  >
                    {STATUS_LABELS[charge.display_status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-fg-subtle">
                    Total <b className="text-fg">{peso(charge.total_amount)}</b>
                  </span>
                  <span className="text-fg-subtle">
                    Charged <b className="text-fg">{peso(charge.chargeable_amount)}</b>
                  </span>
                  <span className="text-fg-subtle">
                    Left <b className="text-fg">{peso(left)}</b>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {viewing && !formState && (
        <ChargeDetails
          charge={viewing}
          canEdit={canEdit}
          canApprove={canApprove}
          onClose={() => setViewingId(null)}
          onChanged={replaceCharge}
          onEdit={() =>
            setFormState({ initial: formFromCharge(viewing), charge: viewing })
          }
          onRevise={() =>
            setFormState({
              initial: formFromCharge(viewing),
              charge: viewing,
              revising: true,
            })
          }
        />
      )}

      {formState && (
        <ChargeForm
          initial={formState.initial}
          charge={formState.charge}
          revising={formState.revising}
          employees={employees}
          onClose={() => setFormState(null)}
          onSaved={(saved) => {
            replaceCharge(saved);
            setFormState(null);
            setViewingId(saved.id);
          }}
        />
      )}
    </div>
  );
}
