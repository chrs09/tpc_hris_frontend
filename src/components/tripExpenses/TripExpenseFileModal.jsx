import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { TRIP_EXPENSE_CATEGORIES, fileTripExpense, getExpenseTrips } from "../../api/tripExpenses";
import SearchSelect from "../SearchSelect";
import { peso } from "./format";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const blankLine = () => ({ key: Math.random(), category: "", description: "", amount: "" });

// File a trip budget (money first) or an expense report (spent first).
// employees: pass a list (Finance filing for a driver) to pick who it's
// for; leave it out for the logged-in driver's own.
export default function TripExpenseFileModal({ employees, onClose, onFiled }) {
  const [kind, setKind] = useState("budget");
  const [employee, setEmployee] = useState(null);
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const [saving, setSaving] = useState(false);
  const forSomeone = Boolean(employees);

  useEffect(() => {
    if (forSomeone && !employee) {
      setTrips([]);
      return;
    }
    getExpenseTrips(forSomeone ? employee.value : undefined)
      .then(setTrips)
      .catch(() => setTrips([]));
    setTripId("");
  }, [forSomeone, employee]);

  const total = lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const setLine = (key, field, value) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  const submit = async () => {
    if (forSomeone && !employee) return toast.error("Pick the driver.");
    if (kind === "budget" && !tripId) return toast.error("Pick the trip this budget is for.");
    if (!lines.length || lines.some((l) => !l.category || !(Number(l.amount) > 0))) {
      return toast.error("Each line needs a category and an amount.");
    }
    try {
      setSaving(true);
      const created = await fileTripExpense({
        kind,
        employee_id: forSomeone ? employee.value : undefined,
        trip_id: tripId ? Number(tripId) : null,
        purpose,
        lines: lines.map((l) => ({
          category: l.category,
          description: l.description,
          amount: Number(l.amount),
        })),
      });
      toast.success(
        kind === "budget"
          ? "Budget requested."
          : "Expense report started -- attach the receipts, then submit it.",
      );
      onFiled?.(created);
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not file it.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 text-fg shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">New trip expense</h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            { value: "budget", label: "Trip budget", hint: "Money first, then liquidate" },
            { value: "report", label: "Expense report", hint: "Already paid -- get reimbursed" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={`rounded-xl border p-3 text-left ${
                kind === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-surface-hover"
              }`}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="text-xs text-fg-subtle">{option.hint}</p>
            </button>
          ))}
        </div>

        <div className="space-y-3 text-sm">
          {forSomeone && (
            <label className="block">
              <span className="mb-1 block font-medium text-fg-muted">Driver</span>
              <SearchSelect
                value={employee}
                options={employees}
                onChange={setEmployee}
                placeholder="Search employee"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block font-medium text-fg-muted">
              Trip {kind === "budget" ? "(required)" : "(optional)"}
            </span>
            <select value={tripId} onChange={(e) => setTripId(e.target.value)} className={inputClass}>
              <option value="">{trips.length ? "Pick a trip" : "No recent trips"}</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-fg-muted">Purpose</span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={kind === "budget" ? "e.g. Offshore delivery to Tagbilaran" : "e.g. Brake pads for JAH 4725"}
              className={inputClass}
            />
          </label>

          <div>
            <p className="mb-1 font-medium text-fg-muted">
              {kind === "budget" ? "What the budget is for" : "Expenses paid"}
            </p>
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[150px_1fr_110px_auto]">
                  <select
                    value={line.category}
                    onChange={(e) => setLine(line.key, "category", e.target.value)}
                    className={`${inputClass} col-span-2 sm:col-span-1`}
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
                    placeholder="Details"
                    className={`${inputClass} col-span-2 sm:col-span-1`}
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
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    disabled={lines.length === 1}
                    className="rounded-lg p-2 text-fg-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, blankLine()])}
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Plus size={15} /> Add line
              </button>
              <span className="font-semibold">Total {peso(total)}</span>
            </div>
          </div>
          {kind === "report" && (
            <p className="text-xs text-fg-subtle">
              Next you&apos;ll attach a receipt to each expense, then submit it for review.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="mt-5 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : kind === "budget" ? "Request budget" : "Continue"}
        </button>
      </div>
    </div>
  );
}
