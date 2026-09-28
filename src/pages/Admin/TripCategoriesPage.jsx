import { useState, useEffect } from "react";
import { Tags, Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
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
  const [tripRates, setTripRates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
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
    try {
      await updateRateProfile(editingProfile.id, form);
      toast.success("Rate profile updated successfully");
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
    setEditingProfile(profile);
    setForm({
      profile_name: profile.profile_name || "",
      helper_count: profile.helper_count || 0,
      driver_first_trip_rate: profile.driver_first_trip_rate || 0,
      driver_next_trip_rate: profile.driver_next_trip_rate || 0,
      helper_first_trip_rate: profile.helper_first_trip_rate || 0,
      helper_next_trip_rate: profile.helper_next_trip_rate || 0,
    });
    setShowModal(true);
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
        <div className="flex-1" />
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
                  {formatCurrency(rate.driver_first_trip_rate)}
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Driver Next Trip</p>
                <p className="font-bold">
                  {formatCurrency(rate.driver_next_trip_rate)}
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Helper First Trip</p>
                <p className="font-bold">
                  {formatCurrency(rate.helper_first_trip_rate)}
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-xs text-fg-subtle">Helper Next Trip</p>
                <p className="font-bold">
                  {formatCurrency(rate.helper_next_trip_rate)}
                </p>
              </div>
            </div>

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
        </div>
      </MaintenanceModal>
    </div>
  );
}
