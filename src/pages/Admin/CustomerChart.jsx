import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  Route,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";
import {
  addTierLocations,
  createCustomer,
  createTier,
  deleteCustomer,
  deleteTier,
  getCustomerChart,
  getTierLocations,
  searchChartLocations,
  unassignLocations,
  updateCustomer,
  updateTier,
} from "../../api/customerChart";

// Customers -> Customer Chart: the customer master as a tree (like the Org
// Chart). Each customer has its own tiers (T1, T1.5, T2 ... any name), each
// tier its rate source and its locations. Trip Dispatch starts from here.

const getErrorMessage = (error) =>
  error?.response?.data?.detail || error?.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const RATE_SOURCE_LABEL = {
  lane: "Lane rate",
  trip_profile: "Trip profile",
};

const RateSourceIcon = ({ source, size = 12 }) =>
  source === "lane" ? <Route size={size} /> : <Tag size={size} />;

export default function CustomerChart() {
  const canEdit = usePageCanEdit();
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const load = useCallback(async () => {
    try {
      setChart(await getCustomerChart());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const childrenOf = useMemo(() => {
    const map = {};
    (chart?.customers || []).forEach((c) => {
      const key = c.parent_id ?? "root";
      (map[key] = map[key] || []).push(c);
    });
    return map;
  }, [chart]);

  const query = search.trim().toLowerCase();
  const matches = (c) =>
    !!query &&
    (c.name.toLowerCase().includes(query) ||
      (c.code || "").toLowerCase().includes(query) ||
      c.tiers.some((t) => t.name.toLowerCase().includes(query)));

  const addCustomer = async (parentId) => {
    const name = await promptDialog(
      parentId ? "Name of the sub-customer:" : "Name of the new customer:",
    );
    if (name === null) return;
    if (!name.trim()) {
      toast.error("Enter a name.");
      return;
    }
    try {
      const res = await createCustomer({ name: name.trim(), parent_id: parentId });
      toast.success("Customer added.");
      await load();
      setOpenCustomerId(res.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeCustomer = async (customer) => {
    const ok = await confirmDialog(
      `Remove ${customer.name}? Only a customer with no sub-customers, tiers or trips can be removed.`,
      { confirmText: "Remove" },
    );
    if (!ok) return;
    try {
      await deleteCustomer(customer.id);
      toast.success("Customer removed.");
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openCustomer = chart?.customers.find((c) => c.id === openCustomerId);
  const roots = childrenOf.root || [];

  return (
    <div className="space-y-5">
      <SectionTabs group="Customers" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fg sm:text-xl">Customer Chart</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Each customer has its own tiers (T1, T2 ... any name). A tier holds
            its locations and decides where the trip rate comes from. Trip
            Dispatch starts from the customer and tier.
            {canEdit && " Click a customer to manage its tiers and locations."}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or tier"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                editMode
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-fg hover:bg-surface-hover"
              }`}
            >
              {editMode ? "Done Editing" : "Edit Chart"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-fg-subtle">Loading...</p>
      ) : !chart ? null : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 p-6">
          <div className="mx-auto flex w-max min-w-full flex-col items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-6 py-4 shadow-sm">
              <Building2 className="text-primary" size={26} />
              <div>
                <p className="text-base font-bold text-fg">{chart.company}</p>
                <p className="text-xs text-fg-muted">
                  Customer Master · {chart.customers.length} customer
                  {chart.customers.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {(roots.length > 0 || editMode) && <div className="h-6 w-px bg-border" />}

            <Children
              items={roots}
              childrenOf={childrenOf}
              render={(customer) => (
                <CustomerCard
                  customer={customer}
                  highlighted={matches(customer)}
                  editMode={editMode}
                  onOpen={() => setOpenCustomerId(customer.id)}
                  onAdd={() => addCustomer(customer.id)}
                  onDelete={() => removeCustomer(customer)}
                />
              )}
            />

            {editMode && (
              <button
                type="button"
                onClick={() => addCustomer(null)}
                className="mt-6 flex items-center gap-1 rounded-xl border border-dashed border-border px-4 py-2 text-xs font-medium text-fg-muted hover:border-primary hover:text-primary"
              >
                <Plus size={14} /> Add customer
              </button>
            )}

            {chart.unassigned_count > 0 && (
              <button
                type="button"
                onClick={() => setShowUnassigned(true)}
                className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-warning/60 bg-warning/10 px-4 py-2 text-xs font-medium text-warning hover:bg-warning/15"
              >
                <MapPin size={14} />
                {chart.unassigned_count} location
                {chart.unassigned_count === 1 ? "" : "s"} not on the chart yet
              </button>
            )}
          </div>
        </div>
      )}

      {openCustomer && (
        <CustomerPanel
          customer={openCustomer}
          chart={chart}
          canEdit={canEdit}
          onClose={() => setOpenCustomerId(null)}
          onChanged={load}
        />
      )}

      {showUnassigned && (
        <UnassignedPanel onClose={() => setShowUnassigned(false)} />
      )}
    </div>
  );
}

// One level of the tree: each customer with a line up to a shared
// horizontal line, then its sub-customers below (same as the Org Chart).
function Children({ items, childrenOf, render }) {
  if (!items.length) return null;
  return (
    <div className="flex items-start">
      {items.map((item, index) => {
        const kids = childrenOf[item.id] || [];
        return (
          <div key={item.id} className="relative flex flex-col items-center px-3">
            {items.length > 1 && (
              <div
                className={`absolute top-0 h-px bg-border ${
                  index === 0
                    ? "left-1/2 right-0"
                    : index === items.length - 1
                      ? "left-0 right-1/2"
                      : "left-0 right-0"
                }`}
              />
            )}
            <div className="h-6 w-px bg-border" />
            {render(item)}
            {kids.length > 0 && (
              <>
                <div className="h-6 w-px bg-border" />
                <Children items={kids} childrenOf={childrenOf} render={render} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

const IconBtn = ({ label, onClick, danger = false, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`flex h-6 w-6 items-center justify-center rounded-md border border-border text-fg-muted ${
      danger ? "hover:border-danger hover:text-danger" : "hover:border-primary hover:text-primary"
    }`}
  >
    {children}
  </button>
);

function CustomerCard({ customer, highlighted, editMode, onOpen, onAdd, onDelete }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={`w-64 cursor-pointer rounded-2xl border bg-surface text-left shadow-sm transition hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        highlighted ? "border-warning ring-2 ring-warning/30" : "border-border"
      } ${customer.is_active ? "" : "opacity-60"}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-fg">{customer.name}</p>
          <p className="text-[11px] text-fg-subtle">
            {customer.code ? `${customer.code} · ` : ""}
            {customer.location_count} location{customer.location_count === 1 ? "" : "s"}
            {!customer.is_active && " · off"}
          </p>
        </div>
        {editMode && (
          <div className="flex shrink-0 gap-1">
            <IconBtn label="Edit customer" onClick={onOpen}>
              <Pencil size={13} />
            </IconBtn>
            <IconBtn label="Add sub-customer" onClick={onAdd}>
              <Plus size={13} />
            </IconBtn>
            <IconBtn label="Remove customer" onClick={onDelete} danger>
              <Trash2 size={13} />
            </IconBtn>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {customer.tiers.length === 0 ? (
          <p className="text-xs text-fg-subtle">No tiers yet</p>
        ) : (
          customer.tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1 text-xs ${
                tier.is_active ? "" : "opacity-50"
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-fg">
                <span className="truncate">{tier.name}</span>
                <span className="flex shrink-0 items-center gap-1 font-normal text-fg-subtle">
                  <RateSourceIcon source={tier.rate_source} />
                  {RATE_SOURCE_LABEL[tier.rate_source]}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-fg-muted">{tier.location_count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ side panel
function Drawer({ title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface text-fg">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-xs text-fg-subtle">{subtitle}</p>}
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
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-fg-subtle">{label}</label>
    {children}
  </div>
);

function CustomerPanel({ customer, chart, canEdit, onClose, onChanged }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tierId, setTierId] = useState(customer.tiers[0]?.id ?? null);

  useEffect(() => {
    setForm({
      name: customer.name,
      code: customer.code || "",
      notes: customer.notes || "",
      parent_id: customer.parent_id,
      is_active: customer.is_active,
    });
  }, [customer]);

  useEffect(() => {
    if (!customer.tiers.some((t) => t.id === tierId)) {
      setTierId(customer.tiers[0]?.id ?? null);
    }
  }, [customer, tierId]);

  // Parent options: any customer except itself and the ones below it.
  const below = useMemo(() => {
    const out = new Set([customer.id]);
    let added = true;
    while (added) {
      added = false;
      chart.customers.forEach((c) => {
        if (c.parent_id && out.has(c.parent_id) && !out.has(c.id)) {
          out.add(c.id);
          added = true;
        }
      });
    }
    return out;
  }, [chart, customer.id]);
  const parentOptions = [
    { id: null, name: `${chart.company} (top level)` },
    ...chart.customers.filter((c) => !below.has(c.id)),
  ];

  const saveCustomer = async () => {
    try {
      setSaving(true);
      await updateCustomer(customer.id, form);
      toast.success("Customer saved.");
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const addTier = async () => {
    const name = await promptDialog("Tier name (e.g. T1, T1.5, T2):");
    if (name === null) return;
    if (!name.trim()) {
      toast.error("Enter a tier name.");
      return;
    }
    try {
      const res = await createTier(customer.id, {
        name: name.trim(),
        rate_source: "trip_profile",
      });
      toast.success(res.message);
      await onChanged();
      setTierId(res.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const tier = customer.tiers.find((t) => t.id === tierId);

  return (
    <Drawer
      title={customer.name}
      subtitle={`${customer.location_count} locations · ${customer.tiers.length} tier${
        customer.tiers.length === 1 ? "" : "s"
      }`}
      onClose={onClose}
    >
      {canEdit && (
        <section className="space-y-3 rounded-2xl border border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                id="customer-name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputStyles}
                maxLength={150}
              />
            </Field>
            <Field label="Code (optional)">
              <input
                id="customer-code"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={inputStyles}
                maxLength={30}
                placeholder="e.g. CCBPI"
              />
            </Field>
            <Field label="Under">
              <SearchSelect
                value={parentOptions.find((p) => p.id === (form.parent_id ?? null))}
                options={parentOptions}
                onChange={(p) => setForm({ ...form, parent_id: p ? p.id : null })}
                getOptionLabel={(p) => p?.name || ""}
                getOptionValue={(p) => String(p?.id)}
              />
            </Field>
            <Field label="Status">
              <label className="flex h-[46px] items-center gap-2 text-sm">
                <input
                  id="customer-active"
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Active (shown in Trip Dispatch)
              </label>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              id="customer-notes"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={`${inputStyles} min-h-[64px]`}
            />
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveCustomer}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {customer.tiers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTierId(t.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                t.id === tierId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-fg-muted hover:bg-surface-hover"
              } ${t.is_active ? "" : "opacity-60"}`}
            >
              <RateSourceIcon source={t.rate_source} size={13} />
              {t.name}
              <span className="font-normal tabular-nums">{t.location_count}</span>
            </button>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={addTier}
              className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-1.5 text-sm text-fg-muted hover:border-primary hover:text-primary"
            >
              <Plus size={14} /> Add tier
            </button>
          )}
        </div>

        {tier ? (
          <TierEditor
            key={tier.id}
            tier={tier}
            truckTypes={chart.truck_types}
            rateSources={chart.rate_sources}
            canEdit={canEdit}
            onChanged={onChanged}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-fg-subtle">
            No tiers yet.{canEdit && " Add one to put locations under this customer."}
          </p>
        )}
      </section>
    </Drawer>
  );
}

function TierEditor({ tier, truckTypes, rateSources, canEdit, onChanged }) {
  const [form, setForm] = useState({
    name: tier.name,
    description: tier.description || "",
    rate_source: tier.rate_source,
    truck_type_ids: tier.truck_type_ids || [],
    is_active: tier.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [filter, setFilter] = useState("");

  const loadLocations = useCallback(async () => {
    try {
      setLocations(await getTierLocations(tier.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingLocations(false);
    }
  }, [tier.id]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await updateTier(tier.id, form);
      toast.success(res.message);
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDialog(
      `Remove tier ${tier.name}? Only a tier with no locations and no trips can be removed.`,
      { confirmText: "Remove" },
    );
    if (!ok) return;
    try {
      await deleteTier(tier.id);
      toast.success("Tier removed.");
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const unassign = async (store) => {
    try {
      await unassignLocations([store.id]);
      toast.success(`${store.name} removed from ${tier.name}.`);
      loadLocations();
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleTruck = (id) =>
    setForm((f) => ({
      ...f,
      truck_type_ids: f.truck_type_ids.includes(id)
        ? f.truck_type_ids.filter((x) => x !== id)
        : [...f.truck_type_ids, id],
    }));

  const term = filter.trim().toLowerCase();
  const shown = term
    ? locations.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          (l.area || "").toLowerCase().includes(term),
      )
    : locations;

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tier name">
              <input
                id={`tier-name-${tier.id}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputStyles}
                maxLength={50}
              />
            </Field>
            <Field label="Description">
              <input
                id={`tier-desc-${tier.id}`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputStyles}
                maxLength={255}
                placeholder="e.g. Plant / DC lanes"
              />
            </Field>
          </div>
          <Field label="Trip rate comes from">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rateSources.map((source) => (
                <label
                  key={source.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                    form.rate_source === source.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name={`rate-source-${tier.id}`}
                    checked={form.rate_source === source.value}
                    onChange={() => setForm({ ...form, rate_source: source.value })}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="flex items-center gap-1 font-semibold">
                      <RateSourceIcon source={source.value} size={13} />
                      {RATE_SOURCE_LABEL[source.value]}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {source.value === "lane"
                        ? "Driver Rates lane: truck type + start point → location. Falls back to the location's trip profile."
                        : "The location's trip profile (DP, KD, WS ...). A Driver Rates rule can still override it."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Allowed truck types (none picked = any)">
            <div className="flex flex-wrap gap-1.5">
              {truckTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTruck(t.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.truck_type_ids.includes(t.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-fg-muted hover:bg-surface-hover"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                id={`tier-active-${tier.id}`}
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-danger hover:border-danger"
              >
                Remove Tier
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Tier"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          {tier.description ? `${tier.description} · ` : ""}Rate from{" "}
          {RATE_SOURCE_LABEL[tier.rate_source].toLowerCase()}.
        </p>
      )}

      {canEdit && <AddLocations tier={tier} onAdded={() => { loadLocations(); onChanged(); }} />}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">
            Locations in {tier.name}{" "}
            <span className="font-normal text-fg-subtle">({locations.length})</span>
          </h3>
          <input
            id={`tier-filter-${tier.id}`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter"
            className="w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        {loadingLocations ? (
          <p className="text-sm text-fg-subtle">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-fg-subtle">
            {locations.length ? "No location matches." : "No locations in this tier yet."}
          </p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {shown.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{l.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {[l.is_hub && "Hub", l.area, l.trip_profile || "No trip profile"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => unassign(l)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-fg-muted hover:bg-surface-hover hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Search any location and put it under this tier (moves it from its current
// tier -- a location has one customer).
function AddLocations({ tier, onAdded }) {
  const [q, setQ] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim() && !onlyUnassigned) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        setResults(await searchChartLocations({ q, unassigned: onlyUnassigned }));
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, onlyUnassigned]);

  const add = async (store) => {
    if (store.customer_tier_id && store.customer_tier_id !== tier.id) {
      const ok = await confirmDialog(
        `${store.name} is under ${store.tier_label}. Move it to ${tier.name}? Past trips keep their customer.`,
        { confirmText: "Move", danger: false },
      );
      if (!ok) return;
    }
    try {
      setBusy(true);
      const res = await addTierLocations(tier.id, [store.id]);
      toast.success(res.message);
      setResults((prev) =>
        prev.map((r) =>
          r.id === store.id
            ? { ...r, customer_tier_id: tier.id, tier_label: `this tier (${tier.name})` }
            : r,
        ),
      );
      onAdded();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            id={`add-location-${tier.id}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Add a location to ${tier.name}: search name or area`}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={(e) => setOnlyUnassigned(e.target.checked)}
            className="accent-primary"
          />
          Not on the chart only
        </label>
      </div>
      {results.length > 0 && (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {results.map((r) => {
            const here = r.customer_tier_id === tier.id;
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{r.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {r.tier_label ? `Now: ${r.tier_label}` : "Not on the chart"}
                    {r.area ? ` · ${r.area}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={here || busy}
                  onClick={() => add(r)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-primary hover:border-primary disabled:cursor-default disabled:text-fg-subtle disabled:hover:border-border"
                >
                  {here ? "Added" : r.customer_tier_id ? "Move here" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UnassignedPanel({ onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    searchChartLocations({ unassigned: true })
      .then(setRows)
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setRows([]);
      });
  }, []);
  return (
    <Drawer
      title="Not on the chart"
      subtitle="Open a customer's tier and use “Add a location” to place these."
      onClose={onClose}
    >
      {rows === null ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-fg-subtle">Every location is on the chart.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm">
              <p className="font-medium text-fg">{r.name}</p>
              <p className="text-xs text-fg-subtle">
                {[r.is_hub && "Hub", r.is_supplier && "Supplier", r.area, r.trip_profile]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
