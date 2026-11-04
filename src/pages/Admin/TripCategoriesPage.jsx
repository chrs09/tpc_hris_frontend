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
  ["driver_allowance", "Driver Allowance"],
  ["driver_other", "Driver Other"],
  ["driver_next_trip_rate", "Driver Next"],
  ["driver_next_other", "Driver Next Other"],
  ["helper_first_trip_rate", "Helper 1st"],
  ["helper_first_other", "Helper Other"],
  ["helper_next_trip_rate", "Helper Next"],
  ["helper_next_other", "Helper Next Other"],
  // A 2-helper category when only 1 helper goes. Blank = the normal
  // helper rates are paid.
  ["one_helper_first_trip_rate", "1 Helper: 1st"],
  ["one_helper_first_other", "1 Helper: Other"],
  ["one_helper_next_trip_rate", "1 Helper: Next"],
  ["one_helper_next_other", "1 Helper: Next Other"],
];
const RATE_LABEL = Object.fromEntries(RATE_KEYS);
const ONE_HELPER_KEYS = [
  "one_helper_first_trip_rate",
  "one_helper_first_other",
  "one_helper_next_trip_rate",
  "one_helper_next_other",
];
const isOneHelperKey = (key) => key.startsWith("one_helper_");
// Under the 1 helper / 2 helpers switch the helper fields keep their names.
const tileLabel = (key) =>
  isOneHelperKey(key) ? RATE_LABEL[key.replace("one_helper_", "helper_")] : RATE_LABEL[key];

// What each trip pays: the parts added up. The first key is the rate
// itself (its basic); in current_rates it holds the total. helperView
// "one" swaps in the 1-helper rates.
const rateRows = (helperView = "two") => {
  const one = helperView === "one";
  const h = one ? "one_helper" : "helper";
  return [
    {
      total: "1st Trip Total",
      name: "1st trip",
      keys: ["driver_first_trip_rate", "driver_allowance", "driver_other"],
    },
    {
      total: "Next Trip Total",
      name: "next trip",
      keys: ["driver_next_trip_rate", "driver_next_other"],
    },
    {
      total: "Helper 1st Total",
      name: one ? "1-helper 1st" : "helper 1st",
      keys: [`${h}_first_trip_rate`, `${h}_first_other`],
    },
    {
      total: "Helper Next Total",
      name: one ? "1-helper next" : "helper next",
      keys: [`${h}_next_trip_rate`, `${h}_next_other`],
    },
  ];
};
const RATE_ROWS = rateRows();
// Every row, the 1-helper ones included (for the "pays" previews).
const ALL_ROWS = [...RATE_ROWS, ...rateRows("one").slice(2)];

// In current_rates each rate is the total; its basic is under these keys.
const BASIC_KEY = {
  driver_first_trip_rate: "driver_basic_rate",
  driver_next_trip_rate: "driver_next_basic_rate",
  helper_first_trip_rate: "helper_first_basic_rate",
  helper_next_trip_rate: "helper_next_basic_rate",
  one_helper_first_trip_rate: "one_helper_first_basic_rate",
  one_helper_next_trip_rate: "one_helper_next_basic_rate",
};

const isBlank = (value) => value === null || value === undefined || value === "";

// A rate in effect, for display (the basic, not the total). null = a
// 1-helper rate that isn't set.
const shownRate = (rates, key) => {
  const value = BASIC_KEY[key] && key in rates ? rates[BASIC_KEY[key]] ?? rates[key] : rates[key];
  return isBlank(value) ? (isOneHelperKey(key) ? null : 0) : value;
};

// A row's total from rates in effect, or from a category's base rates.
// null when it's a 1-helper rate that isn't set (normal rate is paid).
const rowTotal = (rate, row) => {
  if (rate.current_rates) {
    const value = rate.current_rates[row.keys[0]];
    return isBlank(value) ? null : Number(value);
  }
  if (isOneHelperKey(row.keys[0]) && isBlank(rate[row.keys[0]])) return null;
  return row.keys.reduce((sum, key) => sum + Number(rate[key] || 0), 0);
};

// Rate tiles grouped per trip, each row ending with what that trip pays.
// tile(key, label) renders a rate; total(row) renders the row's total.
const RateTiles = ({ tile, total, helperView }) => (
  <div className="space-y-3">
    {rateRows(helperView).map((row) => (
      <div key={row.total} className="grid grid-cols-4 gap-2">
        {row.keys.map((key) => tile(key, tileLabel(key)))}
        {row.keys.length < 3 && <div />}
        {total(row)}
      </div>
    ))}
  </div>
);

// [1 helper | 2 helpers] -- which helper rates a 2-helper category shows.
const HelperSwitch = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg bg-surface-hover p-0.5 text-xs">
    {[
      ["one", "1 helper"],
      ["two", "2 helpers"],
    ].map(([key, label]) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className={`rounded-md px-3 py-1 font-medium ${
          value === key ? "bg-surface text-fg shadow" : "text-fg-muted hover:text-fg"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

// The switch in the form, with what the 1-helper rates mean.
const OneHelperNote = ({ value, onChange }) => (
  <div className="space-y-1">
    <HelperSwitch value={value} onChange={onChange} />
    {value === "one" && (
      <p className="text-xs text-fg-subtle">
        Helper rates when only 1 of the 2 helpers goes on the trip. Blank = the 2-helper rates
        are paid. Driver rates don&apos;t change.
      </p>
    )}
  </div>
);

// Blank rate fields save as 0 -- except the 1-helper rates, where blank
// means "pay the normal helper rates" (not sent).
const withZeroRates = (form) => ({
  ...form,
  ...Object.fromEntries(
    RATE_KEYS.map(([key]) =>
      isOneHelperKey(key)
        ? [key, isBlank(form[key]) || Number(form.helper_count) !== 2 ? undefined : form[key]]
        : [key, form[key] === "" ? 0 : form[key]],
    ),
  ),
});

const money = (value, format) => (value === null ? "—" : format(value));

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
  driver_allowance: "",
  driver_other: "",
  driver_next_trip_rate: "",
  driver_next_other: "",
  helper_first_trip_rate: "",
  helper_first_other: "",
  helper_next_trip_rate: "",
  helper_next_other: "",
  ...Object.fromEntries(ONE_HELPER_KEYS.map((key) => [key, ""])),
};

const EMPTY_NEW_RATES = Object.fromEntries(RATE_KEYS.map(([key]) => [key, ""]));

export default function TripCategoriesPage() {
  const canEditPage = usePageCanEdit();
  // Categories (base rates) or Driver Rates (by truck / lane / date).
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "rates" ? "rates" : "categories";
  const [tripRates, setTripRates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Editing: current rates are read-only; new rates go in their own
  // fields with the date they take effect (trips before keep the old
  // rate). Blank new field = keep that rate. fixBase = correct the base
  // rates instead (a typo fix: every trip, past ones included).
  const [newRates, setNewRates] = useState(EMPTY_NEW_RATES);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [fixBase, setFixBase] = useState(false);
  // 2-helper categories: which helper rates the form / a card shows.
  const [helperView, setHelperView] = useState("two");
  const [cardHelperView, setCardHelperView] = useState({});
  const modalHelperView = Number(form.helper_count) === 2 ? helperView : "two";
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

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(value);

  const handleCreate = async () => {
    if (!form.profile_name.trim()) {
      toast.error("Enter the category name.");
      return;
    }
    if (RATE_KEYS.some(([key]) => Number(form[key]) < 0)) {
      toast.error("Rates can't be negative.");
      return;
    }
    try {
      await createRateProfile({ ...withZeroRates(form), effective_from: effectiveFrom });
      toast.success("Rate profile created successfully");
      await loadRateProfiles();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEffectiveFrom("");
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to create rate profile",
      );
    }
  };

  const handleUpdate = async () => {
    const filled = RATE_KEYS.filter(([key]) => String(newRates[key] ?? "").trim() !== "");
    if (filled.length && !effectiveFrom) {
      toast.error("Pick the date the new rates take effect.");
      return;
    }
    if (filled.some(([key]) => Number(newRates[key]) < 0)) {
      toast.error("Rates can't be negative.");
      return;
    }
    try {
      // Name / helpers (and the base rates only when correcting a typo).
      await updateRateProfile(
        editingProfile.id,
        // A typo fix replaces the 1-helper rates too: cleared, then the
        // filled ones set (none filled = pay the normal helper rates).
        fixBase
          ? { ...withZeroRates(form), clear_one_helper: true }
          : { profile_name: form.profile_name, helper_count: form.helper_count },
      );
      if (filled.length) {
        await createTripRateRule({
          trip_rate_profile_id: editingProfile.id,
          ...Object.fromEntries(
            RATE_KEYS.map(([key]) => [
              key,
              String(newRates[key] ?? "").trim() === "" ? null : Number(newRates[key]),
            ]),
          ),
          effective_from: effectiveFrom,
          notes: "Set from the category card",
        });
        toast.success(
          `New rates take effect ${shortDate(effectiveFrom)}: ${filled
            .map(([key, label]) => `${label} ${formatCurrency(Number(newRates[key]))}`)
            .join(" · ")}.`,
        );
      } else {
        toast.success("Category updated.");
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
    // form = the base rates (only edited for a typo fix); what it pays
    // today is shown read-only, new rates go in newRates + a date.
    setEditingProfile(profile);
    setForm({
      profile_name: profile.profile_name || "",
      helper_count: profile.helper_count || 0,
      driver_first_trip_rate: profile.driver_first_trip_rate || 0,
      driver_allowance: profile.driver_allowance || 0,
      driver_other: profile.driver_other || 0,
      driver_next_trip_rate: profile.driver_next_trip_rate || 0,
      driver_next_other: profile.driver_next_other || 0,
      helper_first_trip_rate: profile.helper_first_trip_rate || 0,
      helper_first_other: profile.helper_first_other || 0,
      helper_next_trip_rate: profile.helper_next_trip_rate || 0,
      helper_next_other: profile.helper_next_other || 0,
      ...Object.fromEntries(ONE_HELPER_KEYS.map((key) => [key, profile[key] ?? ""])),
    });
    setNewRates(EMPTY_NEW_RATES);
    setEffectiveFrom("");
    setFixBase(false);
    setHelperView("two");
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
            setEffectiveFrom("");
            setFixBase(false);
            setHelperView("two");
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
          <table className="w-full min-w-[2000px] text-sm text-fg">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                {RATE_KEYS.map(([key, label]) => (
                  <th key={key} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {label}
                  </th>
                ))}
                {RATE_ROWS.map((row) => (
                  <th key={row.total} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {row.total}
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
                        {money(shownRate(current, key), formatCurrency)}
                      </td>
                    ))}
                    {RATE_ROWS.map((row) => (
                      <td key={row.total} className="px-4 py-3 text-right font-bold tabular-nums text-primary">
                        {formatCurrency(rowTotal(rate, row))}
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

            {rate.helper_count === 2 && (
              <div className="mt-3">
                <HelperSwitch
                  value={cardHelperView[rate.id] || "two"}
                  onChange={(value) =>
                    setCardHelperView((prev) => ({ ...prev, [rate.id]: value }))
                  }
                />
              </div>
            )}

            <div className="mt-4">
              <RateTiles
                helperView={rate.helper_count === 2 ? cardHelperView[rate.id] : "two"}
                tile={(key, label) => (
                  <div key={key} className="min-w-0 rounded-xl bg-surface-hover p-2.5">
                    <p className="truncate text-[11px] text-fg-subtle" title={label}>{label}</p>
                    <p className="text-sm font-bold">
                      {money(shownRate(rate.current_rates || rate, key), formatCurrency)}
                    </p>
                  </div>
                )}
                total={(row) => (
                  <div key="total" className="min-w-0 rounded-xl bg-primary/10 p-2.5">
                    <p className="truncate text-[11px] text-fg-subtle" title={row.total}>{row.total}</p>
                    <p className="text-sm font-bold text-primary">
                      {rowTotal(rate, row) === null ? (
                        <span className="text-xs font-medium text-fg-muted">Same as 2 helpers</span>
                      ) : (
                        formatCurrency(rowTotal(rate, row))
                      )}
                    </p>
                  </div>
                )}
              />
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

          {(!editingProfile || fixBase) && (
            <>
              {fixBase && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  Correcting the BASE rates -- this changes every trip, past ones included.
                </p>
              )}
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div>
                <p className="text-sm font-semibold text-fg">
                  {fixBase ? "Base rates" : "Rates"}
                </p>
                {!fixBase && (
                  <p className="text-xs text-fg-subtle">
                    Trips before the effective date pay nothing in this category. Leave the
                    date blank to apply these rates to every trip.
                  </p>
                )}
              </div>
              {Number(form.helper_count) === 2 && (
                <OneHelperNote value={helperView} onChange={setHelperView} />
              )}
              <div className="space-y-3">
                {rateRows(modalHelperView).map((row) => (
                  <div key={row.total} className="grid grid-cols-3 gap-2">
                    {row.keys.map((key) => (
                      <label key={key} className="block min-w-0">
                        <span className="mb-1 block truncate text-xs font-medium text-fg-muted" title={tileLabel(key)}>
                          {tileLabel(key)}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={isOneHelperKey(key) ? "Same" : "0"}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
                        />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              {!editingProfile && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-fg-muted">
                    Effective date
                  </span>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
                  />
                </label>
              )}
              <p className="text-xs text-fg-muted">
                {!editingProfile && effectiveFrom && (
                  <>
                    From <strong>{shortDate(effectiveFrom)}</strong>:{" "}
                  </>
                )}
                Each trip pays its parts added up:{" "}
                {(Number(form.helper_count) === 2 ? ALL_ROWS : RATE_ROWS).map((row, i) => (
                  <span key={row.name}>
                    {i > 0 && " · "}
                    {row.name}{" "}
                    <strong>
                      {rowTotal(form, row) === null
                        ? "same as 2 helpers"
                        : formatCurrency(rowTotal(form, row))}
                    </strong>
                  </span>
                ))}
                .
              </p>
            </div>
            </>
          )}

          {editingProfile && (
            <>
              {/* Current rates -- read-only */}
              <div>
                <p className="mb-2 text-sm font-medium text-fg">
                  Current rates{" "}
                  <span className="font-normal text-fg-subtle">
                    (in effect today
                    {editingProfile.current_rates?.since
                      ? `, since ${shortDate(editingProfile.current_rates.since)}`
                      : ""}
                    )
                  </span>
                </p>
                {Number(form.helper_count) === 2 && (
                  <OneHelperNote value={helperView} onChange={setHelperView} />
                )}
                <div className="mt-2">
                  <RateTiles
                    helperView={modalHelperView}
                    tile={(key, label) => (
                      <div key={key} className="min-w-0 rounded-lg bg-surface-hover px-2 py-2">
                        <p className="truncate text-[11px] text-fg-subtle" title={label}>{label}</p>
                        <p className="text-sm font-semibold text-fg">
                          {money(
                            shownRate(editingProfile.current_rates || editingProfile, key),
                            formatCurrency,
                          )}
                        </p>
                      </div>
                    )}
                    total={(row) => (
                      <div key="total" className="min-w-0 rounded-lg bg-primary/10 px-2 py-2">
                        <p className="truncate text-[11px] text-fg-subtle" title={row.total}>{row.total}</p>
                        <p className="text-sm font-semibold text-primary">
                          {rowTotal(editingProfile, row) === null ? (
                            <span className="text-xs font-medium text-fg-muted">Same as 2 helpers</span>
                          ) : (
                            formatCurrency(rowTotal(editingProfile, row))
                          )}
                        </p>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* New rates + effective date */}
              {!fixBase && (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div>
                    <p className="text-sm font-semibold text-fg">New rates</p>
                    <p className="text-xs text-fg-subtle">
                      Fill only the rates that change; blank keeps the current rate.
                      Trips before the effective date keep the old rates.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {rateRows(modalHelperView).map((row) => (
                      <div key={row.total} className="grid grid-cols-3 gap-2">
                        {row.keys.map((key) => (
                          <label key={key} className="block min-w-0">
                            <span
                              className="mb-1 block truncate text-xs font-medium text-fg-muted"
                              title={`New ${RATE_LABEL[key]}`}
                            >
                              New {tileLabel(key)}
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={newRates[key]}
                              onChange={(e) => setNewRates({ ...newRates, [key]: e.target.value })}
                              placeholder={String(
                                shownRate(editingProfile.current_rates || editingProfile, key) ?? "",
                              )}
                              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-fg-muted">
                      Effective date{" "}
                      {RATE_KEYS.some(([key]) => String(newRates[key]).trim() !== "") && (
                        <span className="text-danger">*</span>
                      )}
                    </span>
                    <input
                      id="rate-effective-from"
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
                    />
                  </label>
                  {effectiveFrom &&
                    RATE_KEYS.some(([key]) => String(newRates[key]).trim() !== "") && (
                      <p className="text-xs text-fg-muted">
                        From <strong>{shortDate(effectiveFrom)}</strong>:{" "}
                        {RATE_KEYS.filter(([key]) => String(newRates[key]).trim() !== "")
                          .map(([key, label]) => `${label} ${formatCurrency(Number(newRates[key]))}`)
                          .join(" · ")}
                        {ALL_ROWS.filter((row) =>
                          row.keys.some((key) => String(newRates[key]).trim() !== ""),
                        ).map((row) => (
                          <span key={row.name}>
                            {" "}→ {row.name} pays{" "}
                            <strong>
                              {formatCurrency(
                                row.keys.reduce(
                                  (sum, key) =>
                                    sum +
                                    Number(
                                      String(newRates[key]).trim() !== ""
                                        ? newRates[key]
                                        : shownRate(editingProfile.current_rates || editingProfile, key) || 0,
                                    ),
                                  0,
                                ),
                              )}
                            </strong>
                          </span>
                        ))}
                      </p>
                    )}
                </div>
              )}

              {/* Rate history */}
              <div>
                <p className="mb-1 text-sm font-medium text-fg">Rate history</p>
                {(() => {
                  const today = todayPH();
                  const changes = [...(editingProfile.rate_changes || [])].sort((a, b) =>
                    a.effective_from.localeCompare(b.effective_from),
                  );
                  const inEffect = [...changes]
                    .reverse()
                    .find((change) => change.effective_from <= today);
                  const rows = [
                    { id: "base", effective_from: null, base: true, ...editingProfile },
                    ...changes,
                  ];
                  return (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-surface-hover text-fg-muted">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium">Effective</th>
                            {RATE_KEYS.map(([key, label]) => (
                              <th key={key} className="px-2 py-1.5 text-right font-medium">
                                {label}
                              </th>
                            ))}
                            <th className="px-2 py-1.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const current = row.base ? !inEffect : inEffect?.id === row.id;
                            const upcoming = !row.base && row.effective_from > today;
                            return (
                              <tr
                                key={row.id}
                                className={`border-t border-border ${current ? "bg-primary/5" : ""}`}
                              >
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                  <span className="font-semibold text-fg">
                                    {row.base ? "Base" : shortDate(row.effective_from)}
                                  </span>
                                  {current && (
                                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                      Current
                                    </span>
                                  )}
                                  {upcoming && (
                                    <span className="ml-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                      Upcoming
                                    </span>
                                  )}
                                </td>
                                {RATE_KEYS.map(([key]) => (
                                  <td key={key} className="px-2 py-1.5 text-right tabular-nums">
                                    {row[key] === null || row[key] === undefined ? (
                                      <span className="text-fg-subtle">
                                        {/* Base 1-helper rate not set: the 2-helper rate is paid. */}
                                        {row.base && isOneHelperKey(key) ? "—" : "same"}
                                      </span>
                                    ) : (
                                      formatCurrency(Number(row[key]))
                                    )}
                                  </td>
                                ))}
                                <td className="px-2 py-1.5 text-right">
                                  {!row.base && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteChange(row)}
                                      className="rounded-md px-1.5 py-0.5 text-danger hover:bg-danger/10"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                <p className="mt-1 text-[11px] text-fg-subtle">
                  &quot;same&quot; = unchanged from the row above.
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
            </>
          )}
        </div>
      </MaintenanceModal>
      </>
      )}
    </div>
  );
}
