import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Building2, Pencil, Plus, Trash2, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { matchesSearch } from "../../utils/search";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "../../api/companies";

const EMPTY = {
  name: "",
  code: "",
  tin: "",
  address: "",
  contact_person: "",
  contact_number: "",
  notes: "",
  is_active: true,
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Administrator -> Companies (superadmin only): the companies in the
// group. For now Fleet Management tags each vehicle unit with one; kept
// for future use elsewhere. A company with vehicles is deactivated, not
// deleted.
export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // null = closed; { ...fields, id? }
  const [saving, setSaving] = useState(false);

  const load = () =>
    getCompanies()
      .then(setCompanies)
      .catch(() => toast.error("Failed to load companies."))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const shown = companies.filter((c) =>
    matchesSearch(search, c.name, c.code, c.tin, c.address, c.contact_person),
  );

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Enter the company name.");
      return;
    }
    setSaving(true);
    try {
      const { id, ...payload } = form;
      if (id) await updateCompany(id, payload);
      else await createCompany(payload);
      toast.success(id ? "Company updated." : "Company added.");
      setForm(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save company.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (company) => {
    if (!(await confirmDialog(`Delete "${company.name}"?`))) return;
    try {
      await deleteCompany(company.id);
      toast.success("Company deleted.");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete company.");
    }
  };

  const field = (key, label, props = {}) => (
    <label className="block text-xs font-medium text-fg-muted">
      {label}
      <input
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputClass}
        {...props}
      />
    </label>
  );

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Companies</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            The companies in the group. Vehicle units can be tagged with the
            company they belong to (Fleet Management). Superadmin only.
          </p>
        </div>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus size={16} /> Add Company
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search name, code, TIN..." />

      {loading ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
          {companies.length ? "No company matches your search." : "No companies yet — add the first one."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border border-border bg-surface p-4 ${c.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Building2 size={18} className="mt-0.5 shrink-0 text-fg-muted" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{c.name}</p>
                    <p className="text-xs text-fg-subtle">
                      {[c.code, c.tin && `TIN ${c.tin}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setForm({ ...EMPTY, ...c })}
                    title="Edit"
                    className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    title={c.vehicle_count ? "Has vehicles — deactivate it instead" : "Delete"}
                    disabled={c.vehicle_count > 0}
                    className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {c.address && <p className="mt-2 text-xs text-fg-muted">{c.address}</p>}
              {(c.contact_person || c.contact_number) && (
                <p className="mt-1 text-xs text-fg-muted">
                  {[c.contact_person, c.contact_number].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-fg-muted">
                  {c.vehicle_count} vehicle{c.vehicle_count === 1 ? "" : "s"}
                </span>
                {!c.is_active && (
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 font-semibold text-warning">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-lg font-bold">{form.id ? "Edit Company" : "Add Company"}</h3>
              <button onClick={() => setForm(null)} className="text-fg-muted hover:text-fg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              {field("name", "Company name *", { placeholder: "e.g. Tytan Prime Corporation" })}
              <div className="grid grid-cols-2 gap-3">
                {field("code", "Short code", { placeholder: "e.g. TPC" })}
                {field("tin", "TIN")}
              </div>
              {field("address", "Address")}
              <div className="grid grid-cols-2 gap-3">
                {field("contact_person", "Contact person")}
                {field("contact_number", "Contact number")}
              </div>
              <label className="block text-xs font-medium text-fg-muted">
                Notes
                <textarea
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Active (shown when picking a company)
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={() => setForm(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
