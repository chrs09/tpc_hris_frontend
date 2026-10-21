import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tags, Plus, Pencil, Archive, ArchiveRestore, Download } from "lucide-react";
import { exportTripCategories } from "../../utils/trips/tripRatesExcel";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import {
  getRateProfiles,
  createRateProfile,
  updateRateProfile,
  deleteRateProfile,
} from "../../api/adminTripManagement/tripMaintenance";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { toast } from "react-hot-toast";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import ViewToggle from "../../components/ui/viewToggle/ViewToggle";
import useViewType from "../../hooks/useViewType";
import {
  createTripRateRule,
  deleteTripRateRule,
} from "../../api/adminTripManagement/tripRateRules";
import DriverRatesPanel from "../../components/tripMaintenance/DriverRatesPanel";

const RATE_KEYS = [
  ["driver_first_trip_rate", "Driver 1st"],
  ["driver_next_trip_rate", "Driver Next"],
  ["helper_first_trip_rate", "Helper 1st"],
  ["helper_next_trip_rate", "Helper Next"],
];

// Today in the Philippines, "YYYY-MM-DD".
const todayPH = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const shortDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const EMPTY_FORM = {
  profile_name: "",
  helper_count: 0,
  driver_first_trip_rate: "",
  driver_next_trip_rate: "",
  helper_first_trip_rate: "",
  helper_next_trip_rate: "",
};

export default function TripCategoriesPage() {
  const canEditPage = usePageCanEdit();
  // Categories (base rates) or Driver Rates (by truck / lane / date).
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "rates" ? "rates" : "categories";
  const [tripRates, setTripRates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Editing rates: they take effect from this date (past trips keep the
  // old rate). fixBase = correct the base rate instead (every trip).
  const [effectiveFrom, setEffectiveFrom] = useState(todayPH());
  const [fixBase, setFixBase] = useState(false);
  // Categories as cards or a table (remembered per browser).
  const [viewType, setViewType] = useViewType("trip_categories_view");
  const [search, setSearch] = useState("");
  // Archived categories are hidden unless this is on.
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const archivedCount = tripRates.filter((rate) => !rate.is_active).length;
  const filteredRates = tripRates.filter(
    (rate) =>
      (showArchived || rate.is_active) &&
      matchesSearch(search, rate.profile_name, rate.code, rate.helper_count),
  );
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredRates,
    9,
  );

  const loadRateProfiles = async () => {
    try {
      const response = await getRateProfiles();
      setTripRates(response || []);
    } catch (error) {
      console.error("Failed to load rate profiles", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadRateProfiles();
    };

    loadData();
  }, []);

  const handleCreate = async () => {
    try {
      await createRateProfile(form);
      toast.success("Rate profile created successfully");
      await loadRateProfiles();
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to create rate profile",
      );
    }
  };

  const handleUpdate = async () => {
    const current = editingProfile.current_rates || editingProfile;
    const ratesChanged = RATE_KEYS.some(
      ([key]) => Number(form[key] || 0) !== Number(current[key] || 0),
    );
    try {
      if (ratesChanged && !fixBase) {
        if (!effectiveFrom) {
          toast.error("Pick the date the new rates take effect.");
          return;
        }
        // Name / helpers now; the rates from the effective date.
        await updateRateProfile(editingProfile.id, {
          profile_name: form.profile_name,
          helper_count: form.helper_count,
        });
        await createTripRateRule({
          trip_rate_profile_id: editingProfile.id,
          ...Object.fromEntries(RATE_KEYS.map(([key]) => [key, Number(form[key] || 0)])),
          effective_from: effectiveFrom,
          notes: "Set from the category card",
        });
        toast.success(`New rates take effect ${shortDate(effectiveFrom)}.`);
      } else {
        await updateRateProfile(editingProfile.id, form);
        toast.success("Rate profile updated successfully");
      }
      await loadRateProfiles();
      setEditingProfile(null);
      setShowModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to update profile");
    }
  };

  // Archive = deactivate: the category stays on past trips and payroll,
  // but can't be picked for new ones.
  const handleArchive = async (profile) => {
    const storeNote = profile.store_count
      ? ` ${profile.store_count} store(s) still use it -- new trips to those stores will be blocked until they're moved to another category.`
      : "";
    if (
      !(await confirmDialog(
        `Archive "${profile.profile_name}"? It will be hidden and can't be used for new trips. Past trips keep their rates.${storeNote}`,
      ))
    ) {
      return;
    }
    try {
      setArchivingId(profile.id);
      await deleteRateProfile(profile.id);
      toast.success("Category archived");
      await loadRateProfiles();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to archive category");
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestore = async (profile) => {
    try {
      setArchivingId(profile.id);
      await updateRateProfile(profile.id, { is_active: true });
      toast.success("Category restored");
      await loadRateProfiles();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to restore category");
    } finally {
      setArchivingId(null);
    }
  };

  const handleEdit = (profile) => {
    // Start from what the category pays today (base + dated changes).
    const current = profile.current_rates || profile;
    setEditingProfile(profile);
    setForm({
      profile_name: profile.profile_name || "",
      helper_count: profile.helper_count || 0,
      driver_first_trip_rate: current.driver_first_trip_rate || 0,
      driver_next_trip_rate: current.driver_next_trip_rate || 0,
      helper_first_trip_rate: current.helper_first_trip_rate || 0,
      helper_next_trip_rate: current.helper_next_trip_rate || 0,
    });
    setEffectiveFrom(todayPH());
    setFixBase(false);
    setShowModal(true);
  };

  const handleDeleteChange = async (change) => {
    if (
      !(await confirmDialog(
        `Remove the rate change from ${shortDate(change.effective_from)}? Trips on and after that date go back to the rate before it.`,
      ))
    ) {
      return;
    }
    try {
      await deleteTripRateRule(change.id);
      toast.success("Rate change removed.");
      const response = await getRateProfiles();
      const list = response?.data || response || [];
      setTripRates(list);
      setEditingProfile(list.find((p) => p.id === editingProfile.id) || editingProfile);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Couldn't remove the rate change.");
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div>
        <h1 className="text-3xl font-bold text-fg">Trip Categories & Rates</h1>
        <p className="text-fg-muted mt-1">
          Manage trip categories and driver/helper trip rates.
        </p>
      </div>

      <div className="inline-flex gap-1 rounded-xl bg-surface-hover p-1">
        {[
          ["categories", "Categories"],
          ["rates", "Driver Rates (truck · lane · date)"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (key === "rates") next.set("view", "rates");
                  else next.delete("view");
                  return next;
                },
                { replace: true },
              )
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === key ? "bg-surface text-fg shadow" : "text-fg-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "rates" ? (
        <DriverRatesPanel canEdit={canEditPage} />
      ) : (
      <>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search categories..."
        />
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Show archived ({archivedCount})
        </label>
        <ViewToggle viewType={viewType} onChange={setViewType} />
        <div className="flex-1" />
        <button
          type="button"
          disabled={!filteredRates.length}
          onClick={() =>
            exportTripCategories(filteredRates).catch(() =>
              toast.error("Export failed."),
            )
          }
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
        >
          <Download size={18} />
          Export
        </button>
        {canEditPage && (
          <button
          onClick={() => {
            setEditingProfile(null);
            setForm(EMPTY_FORM);
            setShowModal(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Category
        </button>
        )}
      </div>

      {viewType === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm text-fg">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                {RATE_KEYS.map(([key, label]) => (
                  <th key={key} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium">Rate change</th>
                {canEditPage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((rate) => {
                const current = rate.current_rates || rate;
                const upcoming = (rate.rate_changes || [])
                  .filter((change) => change.effective_from > todayPH())
                  .reverse()[0];
                return (
                  <tr
                    key={rate.id}
                    className={`border-t border-border hover:bg-surface-hover ${rate.is_active ? "" : "opacity-60"}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {rate.profile_name}
                        {!rate.is_active && (
                          <span className="ml-2 rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                            Archived
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {rate.helper_count} helper(s)
                        {rate.store_count > 0 && ` · ${rate.store_count} store(s)`}
                      </p>
                    </td>
                    {RATE_KEYS.map(([key]) => (
                      <td key={key} className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(current[key])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-xs">
                      {upcoming ? (
                        <span className="text-warning">
                          From {shortDate(upcoming.effective_from)}:{" "}
                          {RATE_KEYS.filter(([key]) => upcoming[key] !== null)
                            .map(([key, label]) => `${label} ${formatCurrency(upcoming[key])}`)
                            .join(" · ")}
                        </span>
                      ) : rate.current_rates?.since ? (
                        <span className="text-fg-subtle">Since {shortDate(rate.current_rates.since)}</span>
                      ) : (
                        <span className="text-fg-subtle">--</span>
                      )}
                    </td>
                    {canEditPage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {rate.is_active ? (
                            <>
                              <button
                                onClick={() => handleEdit(rate)}
                                title="Edit"
                                className="rounded-lg p-2 text-primary hover:bg-primary/10"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleArchive(rate)}
                                disabled={archivingId === rate.id}
                                title="Archive"
                                className="rounded-lg p-2 text-fg-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                              >
                                <Archive size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(rate)}
                              disabled={archivingId === rate.id}
                              title="Restore"
                              className="rounded-lg p-2 text-primary hover:bg-primary/10 disabled:opacity-50"
                            >
                              <ArchiveRestore size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginatedItems.map((rate) => (
          <div
            key={rate.id}
            className={`bg-surface border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden text-fg ${
              rate.is_active ? "" : "opacity-60"
            }`}
          >
            <div
              className={`h-1 -mx-5 -mt-5 mb-4 ${
                rate.is_active ? "bg-emerald-500" : "bg-fg-subtle"
              }`}
            />

            <div className="flex justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-lg">
                  {rate.profile_name}
                  {!rate.is_active && (
                    <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                      Archived
                    </span>
                  )}
                </h3>
                <p className="text-sm text-fg-muted">
                  {rate.helper_count} Helper(s)
                  {rate.store_count > 0 && ` · ${rate.store_count} store(s)`}
                </p>
              </div>

              <Tags size={20} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Driver 1st</p>
                <p className="font-bold">
                  {formatCurrency((rate.current_rates || rate).driver_first_trip_rate)}
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Driver Next Trip</p>
                <p className="font-bold">
                  {formatCurrency((rate.current_rates || rate).driver_next_trip_rate)}
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Helper First Trip</p>
                <p className="font-bold">
                  {formatCurrency((rate.current_rates || rate).helper_first_trip_rate)}
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Helper Next Trip</p>
                <p className="font-bold">
                  {formatCurrency((rate.current_rates || rate).helper_next_trip_rate)}
                </p>
              </div>
            </div>

            {rate.current_rates?.since && (
              <p className="mt-2 text-xs text-fg-subtle">
                Rates since {shortDate(rate.current_rates.since)}
              </p>
            )}
            {(rate.rate_changes || [])
              .filter((change) => change.effective_from > todayPH())
              .reverse()
              .map((change) => (
                <p
                  key={change.id}
                  className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning"
                >
                  <span className="font-semibold">
                    From {shortDate(change.effective_from)}:
                  </span>{" "}
                  {RATE_KEYS.filter(([key]) => change[key] !== null)
                    .map(([key, label]) => `${label} ${formatCurrency(change[key])}`)
                    .join(" · ")}
                </p>
              ))}

            {canEditPage && (
              <div className="mt-3 flex justify-between">
                {rate.is_active ? (
                  <>
                    <button
                      onClick={() => handleEdit(rate)}
                      title="Edit"
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleArchive(rate)}
                      disabled={archivingId === rate.id}
                      title="Archive"
                      className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-fg-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    >
                      <Archive size={16} />
                      Archive
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestore(rate)}
                    disabled={archivingId === rate.id}
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <ArchiveRestore size={16} />
                    Restore
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <MaintenanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProfile ? "Edit Rate Profile" : "Add Rate Profile"}
        onSave={editingProfile ? handleUpdate : handleCreate}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Category
            </label>
            <input
              value={form.profile_name}
              onChange={(e) =>
                setForm({ ...form, profile_name: e.target.value })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="CPDC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Helpers
            </label>
            <SearchSelect
              value={
                [
                  { value: 0, label: "0" },
                  { value: 1, label: "1" },
                  { value: 2, label: "2" },
                ].find(
                  (option) => String(option.value) === String(form.helper_count),
                ) || null
              }
              options={[
                { value: 0, label: "0" },
                { value: 1, label: "1" },
                { value: 2, label: "2" },
              ]}
              onChange={(option) =>
                setForm({ ...form, helper_count: parseInt(option.value) })
              }
              placeholder="Select helper count"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Driver 1st Trip
              </label>
              <input
                type="number"
                value={form.driver_first_trip_rate}
                onChange={(e) =>
                  setForm({ ...form, driver_first_trip_rate: e.target.value })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="565"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Driver Next Trip
              </label>
              <input
                type="number"
                value={form.driver_next_trip_rate}
                onChange={(e) =>
                  setForm({ ...form, driver_next_trip_rate: e.target.value })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Helper 1st Trip
              </label>
              <input
                type="number"
                value={form.helper_first_trip_rate}
                onChange={(e) =>
                  setForm({ ...form, helper_first_trip_rate: e.target.value })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="217"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Helper Next Trip
              </label>
              <input
                type="number"
                value={form.helper_next_trip_rate}
                onChange={(e) =>
                  setForm({ ...form, helper_next_trip_rate: e.target.value })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="100"
              />
            </div>
          </div>

          {editingProfile && (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div>
                <label
                  htmlFor="rate-effective-from"
                  className="block text-sm font-medium mb-1 text-fg"
                >
                  New rates take effect from
                </label>
                <input
                  id="rate-effective-from"
                  type="date"
                  value={effectiveFrom}
                  disabled={fixBase}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-fg-subtle">
                  Trips before this date keep the old rates. Only used when you
                  change a rate above.
                </p>
              </div>
              <label className="flex items-start gap-2 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={fixBase}
                  onChange={(e) => setFixBase(e.target.checked)}
                  className="mt-0.5"
                />
                Correct the base rates instead (a typo fix: changes every trip,
                past ones included)
              </label>

              {(editingProfile.rate_changes || []).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-fg">Rate changes</p>
                  <ul className="mt-1 divide-y divide-border text-xs">
                    {editingProfile.rate_changes.map((change) => (
                      <li
                        key={change.id}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <span className="text-fg-muted">
                          <span className="font-semibold text-fg">
                            {shortDate(change.effective_from)}
                          </span>
                          {change.effective_from > todayPH() ? " (upcoming)" : ""}:{" "}
                          {RATE_KEYS.filter(([key]) => change[key] !== null)
                            .map(([key, label]) => `${label} ${formatCurrency(change[key])}`)
                            .join(" · ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChange(change)}
                          className="shrink-0 rounded-md px-2 py-1 text-danger hover:bg-danger/10"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    Base rates: {RATE_KEYS.map(([key, label]) => `${label} ${formatCurrency(editingProfile[key])}`).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </MaintenanceModal>
      </>
      )}
    </div>
  );
}
