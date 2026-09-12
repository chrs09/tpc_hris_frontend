import { useState, useEffect } from "react";
import { Tags, Plus, Pencil } from "lucide-react";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import {
  getRateProfiles,
  createRateProfile,
  updateRateProfile,
} from "../../api/adminTripManagement/tripMaintenance";
import { toast } from "react-hot-toast";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

const EMPTY_FORM = {
  profile_name: "",
  helper_count: 0,
  driver_first_trip_rate: "",
  driver_next_trip_rate: "",
  helper_first_trip_rate: "",
  helper_next_trip_rate: "",
};

export default function TripCategoriesPage() {
  const [tripRates, setTripRates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    tripRates,
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

      <div className="flex justify-between mb-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginatedItems.map((rate) => (
          <div
            key={rate.id}
            className="bg-surface border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden text-fg"
          >
            <div className="h-1 bg-emerald-500 -mx-5 -mt-5 mb-4" />

            <div className="flex justify-between">
              <div>
                <h3 className="font-bold text-lg">{rate.profile_name}</h3>
                <p className="text-sm text-fg-muted">
                  {rate.helper_count} Helper(s)
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

            <div className="flex justify-between">
              <button
                onClick={() => handleEdit(rate)}
                className="p-2 rounded-lg hover:bg-primary/10 text-primary"
              >
                <Pencil size={18} />
              </button>
            </div>
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
            <select
              value={form.helper_count}
              onChange={(e) =>
                setForm({ ...form, helper_count: parseInt(e.target.value) })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
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
