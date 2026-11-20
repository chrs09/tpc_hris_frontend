import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";
import {
  bulkUpdateGovContributions,
  getGovContributions,
  updateGovContribution,
} from "../../api/govContributions";

// HRIS -> Government Contributions: every employee, their SSS /
// PhilHealth / Pag-IBIG / TIN numbers (same as Employee Details ->
// Government & Legal), and which contributions payroll deducts. Unticked =
// payroll doesn't deduct it (PayrollList.jsx reads the ticks).

const CONTRIBUTIONS = [
  { flag: "has_sss", number: "sss_number", label: "SSS" },
  { flag: "has_philhealth", number: "philhealth_number", label: "PhilHealth" },
  { flag: "has_pagibig", number: "pagibig_number", label: "Pag-IBIG" },
  { flag: "has_tax", number: "tin_number", label: "Tax", numberLabel: "TIN" },
];

const errorText = (err, fallback) => err?.response?.data?.detail || fallback;

export default function GovContributionsPage() {
  const canEdit = usePageCanEdit();
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [missing, setMissing] = useState("all"); // all | no_number
  const [saving, setSaving] = useState({}); // `${id}:${field}` -> true
  const [drafts, setDrafts] = useState({}); // `${id}:${number}` -> text

  useEffect(() => {
    getGovContributions()
      .then(setRows)
      .catch((err) => {
        toast.error(errorText(err, "Couldn't load employees."));
        setRows([]);
      });
  }, []);

  const departments = useMemo(() => {
    const counts = {};
    (rows || []).forEach((r) => {
      const d = r.department || "No department";
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const shown = useMemo(
    () =>
      (rows || []).filter(
        (r) =>
          (department === "All" || (r.department || "No department") === department) &&
          (missing === "all" ||
            CONTRIBUTIONS.some((c) => r[c.flag] && !(r[c.number] || "").trim())) &&
          matchesSearch(search, r.name, r.department, r.position, ...CONTRIBUTIONS.map((c) => r[c.number])),
      ),
    [rows, department, missing, search],
  );

  const replaceRow = (updated) =>
    setRows((prev) => prev.map((r) => (r.employee_id === updated.employee_id ? updated : r)));

  const save = async (row, field, value) => {
    const key = `${row.employee_id}:${field}`;
    setSaving((prev) => ({ ...prev, [key]: true }));
    // Show the tick right away.
    replaceRow({ ...row, [field]: value });
    try {
      replaceRow(await updateGovContribution(row.employee_id, { [field]: value }));
    } catch (err) {
      replaceRow(row);
      toast.error(errorText(err, "Couldn't save."));
    } finally {
      setSaving((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const saveNumber = (row, field) => {
    const key = `${row.employee_id}:${field}`;
    const text = drafts[key];
    if (text === undefined) return;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if ((text || "").trim() === (row[field] || "")) return;
    save(row, field, text.trim());
  };

  const tickAll = async (contribution, value) => {
    const ids = shown.map((r) => r.employee_id);
    if (!ids.length) return;
    const ok = await confirmDialog(
      `${value ? "Tick" : "Untick"} ${contribution.label} for the ${ids.length} employee${ids.length === 1 ? "" : "s"} shown?`,
    );
    if (!ok) return;
    try {
      await bulkUpdateGovContributions(ids, contribution.flag, value);
      const idSet = new Set(ids);
      setRows((prev) => prev.map((r) => (idSet.has(r.employee_id) ? { ...r, [contribution.flag]: value } : r)));
      toast.success(`${contribution.label} ${value ? "ticked" : "unticked"} for ${ids.length}.`);
    } catch (err) {
      toast.error(errorText(err, "Couldn't update."));
    }
  };

  const counts = CONTRIBUTIONS.map((c) => shown.filter((r) => r[c.flag]).length);

  return (
    <div className="space-y-5">
      <SectionTabs group="HRIS" />

      <div>
        <h1 className="text-xl font-semibold text-fg">Government Contributions</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-subtle">
          Tick the contributions payroll should deduct for each employee. Unticked means payroll
          doesn&apos;t deduct it. The numbers are the same as Employee Details &rarr; Government &amp;
          Legal.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[["All", (rows || []).length], ...departments].map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setDepartment(name)}
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              department === name
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border text-fg-muted hover:bg-surface-hover"
            }`}
          >
            {name} <span className="text-xs text-fg-subtle">({count})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-border p-0.5 text-sm">
          {[
            ["all", "All"],
            ["no_number", "Ticked but no number"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMissing(key)}
              className={`rounded-md px-3 py-1.5 ${
                missing === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, department, number..." />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Employee</th>
              <th className="px-4 py-3 text-left font-medium">Pay</th>
              {CONTRIBUTIONS.map((c, i) => (
                <th key={c.flag} className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center gap-2">
                    {c.label}
                    <span className="font-normal normal-case text-fg-subtle">
                      {counts[i]}/{shown.length}
                    </span>
                  </div>
                  {canEdit && shown.length > 0 && (
                    <div className="mt-1 flex gap-2 font-normal normal-case">
                      <button type="button" onClick={() => tickAll(c, true)} className="text-primary hover:underline">
                        Tick all
                      </button>
                      <button type="button" onClick={() => tickAll(c, false)} className="text-fg-subtle hover:underline">
                        Untick all
                      </button>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle">
                  Loading...
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle">
                  No employees match.
                </td>
              </tr>
            ) : (
              shown.map((row) => (
                <tr key={row.employee_id} className="border-t border-border align-top hover:bg-surface-hover/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{row.name}</p>
                    <p className="text-xs text-fg-subtle">
                      {[row.department, row.position].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{row.payroll_type || "—"}</td>
                  {CONTRIBUTIONS.map((c) => {
                    const numberKey = `${row.employee_id}:${c.number}`;
                    const number = drafts[numberKey] ?? row[c.number] ?? "";
                    const noNumber = row[c.flag] && !(row[c.number] || "").trim();
                    return (
                      <td key={c.flag} className="px-4 py-3">
                        <label className="flex items-center gap-2 text-sm text-fg">
                          <input
                            id={`gc-${row.employee_id}-${c.flag}`}
                            type="checkbox"
                            checked={Boolean(row[c.flag])}
                            disabled={!canEdit || saving[`${row.employee_id}:${c.flag}`]}
                            onChange={(e) => save(row, c.flag, e.target.checked)}
                          />
                          Deduct
                        </label>
                        <input
                          id={`gc-${row.employee_id}-${c.number}`}
                          value={number}
                          disabled={!canEdit}
                          placeholder={`${c.numberLabel || c.label} no.`}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [numberKey]: e.target.value }))}
                          onBlur={() => saveNumber(row, c.number)}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          className={`mt-1 w-40 rounded-md border bg-background px-2 py-1 text-xs text-fg disabled:opacity-70 ${
                            noNumber ? "border-warning" : "border-border"
                          }`}
                        />
                        {noNumber && <p className="mt-0.5 text-[10px] text-warning">No number yet</p>}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-fg-subtle">
        Changes save right away. Payroll uses them the next time a pay run is generated; runs
        already generated keep their figures (fix them at the pay run&apos;s Contributions step).
      </p>
    </div>
  );
}
