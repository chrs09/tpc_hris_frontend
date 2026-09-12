import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import {
  getStores,
  createStore,
  updateStore,
  getTripRateProfilesAdmin, // NEW - fetches real TripRateProfile rows
} from "../../api/adminTripManagement/stores";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";

const initialFormState = {
  name: "",
  latitude: "",
  longitude: "",
  allowed_radius_meters: 100,
  required_helper: 0,
  trip_rate_profile_id: "",
};

export default function StoreManagement() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileFilter, setProfileFilter] = useState("ALL");
  const [tripRateProfiles, setTripRateProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadTripRateProfiles = async () => {
    try {
      setProfilesLoading(true);
      const response = await getTripRateProfilesAdmin();
      setTripRateProfiles(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load trip rate profiles.");
    } finally {
      setProfilesLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const response = await getStores();
      setStores(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
    loadTripRateProfiles();
  }, []);

  const openCreateModal = () => {
    setEditingStore(null);
    setForm(initialFormState);
    setShowModal(true);
  };

  const openEditModal = (store) => {
    // The stores list only returns a resolved profile name (store.profile),
    // not the numeric trip_rate_profile_id, so we look it up here.
    const matchedProfile = tripRateProfiles.find(
      (p) => p.code === store.profile,
    );
    setEditingStore(store);
    setForm({
      name: store.name || "",
      latitude: store.latitude || "",
      longitude: store.longitude || "",
      allowed_radius_meters: store.allowed_radius_meters || 100,
      required_helper: store.required_helper || 0,
      trip_rate_profile_id: matchedProfile ? matchedProfile.id : "",
    });
    setShowModal(true);
  };

  const handleProfileChange = (selectedId) => {
    const numericId = selectedId ? Number(selectedId) : "";
    const matchedProfile = tripRateProfiles.find((p) => p.id === numericId);

    setForm((prev) => ({
      ...prev,
      trip_rate_profile_id: numericId,
      required_helper: matchedProfile ? matchedProfile.helper_count : 0,
    }));
  };

  const handleSaveStore = async () => {
    try {
      const payload = {
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        allowed_radius_meters: Number(form.allowed_radius_meters),
        required_helper: Number(form.required_helper),
        trip_rate_profile_id: form.trip_rate_profile_id
          ? Number(form.trip_rate_profile_id)
          : null,
      };

      if (!payload.name) {
        toast.error("Store name is required.");
        return;
      }

      if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
        toast.error("Latitude and longitude must be valid numbers.");
        return;
      }

      if (!payload.trip_rate_profile_id) {
        toast.error("Please select a trip rate profile.");
        return;
      }

      if (editingStore) {
        await updateStore(editingStore.id, payload);
        toast.success("Store updated successfully.");
      } else {
        await createStore(payload);
        toast.success("Store created successfully.");
      }

      setShowModal(false);
      await loadStores();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Failed to save store.");
    }
  };

  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name
      ?.toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesProfile =
      profileFilter === "ALL" || store.profile === profileFilter;
    return matchesSearch && matchesProfile;
  });

  const totalItems = filteredStores.length;

  const {
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
    paginatedItems: paginatedStores,
  } = usePagination(filteredStores, itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, profileFilter, itemsPerPage, setCurrentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const renderRows = () => {
    if (!filteredStores.length) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-4 text-center text-fg-subtle">
            {stores.length
              ? "No stores match your search or filter."
              : "No stores found."}
          </td>
        </tr>
      );
    }

    return paginatedStores.map((store) => (
      <tr key={store.id} className="border-b border-border last:border-b-0">
        <td className="px-6 py-4 text-fg">{store.name}</td>
        <td className="px-6 py-4 text-fg-muted">{store.profile || "Unassigned"}</td>
        <td className="px-6 py-4 text-fg-muted">{store.required_helper}</td>
        <td className="px-6 py-4 text-fg-muted">{store.allowed_radius_meters} m</td>
        <td className="px-6 py-4 text-fg-muted">
          {store.latitude}, {store.longitude}
        </td>
        <td className="px-6 py-4">
          <button
            className="text-primary hover:text-primary-hover"
            onClick={() => openEditModal(store)}
          >
            Edit
          </button>
        </td>
      </tr>
    ));
  };

  const renderMobileCards = () => {
    if (!filteredStores.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
          {stores.length
            ? "No stores match your search or filter."
            : "No stores found."}
        </div>
      );
    }

    return paginatedStores.map((store) => (
      <div
        key={store.id}
        className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-fg">{store.name}</p>
            <p className="text-xs text-fg-subtle">
              {store.profile || "Unassigned"}
            </p>
          </div>

          <button
            className="text-sm text-primary hover:text-primary-hover"
            onClick={() => openEditModal(store)}
          >
            Edit
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-fg-subtle">Required Helper</span>
            <p className="text-fg-muted">{store.required_helper}</p>
          </div>

          <div>
            <span className="text-xs text-fg-subtle">Radius</span>
            <p className="text-fg-muted">{store.allowed_radius_meters} m</p>
          </div>

          <div className="col-span-2">
            <span className="text-xs text-fg-subtle">Coordinates</span>
            <p className="text-fg-muted">
              {store.latitude}, {store.longitude}
            </p>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-fg">Customer Management</h1>
        <p className="text-fg-muted mt-1">
          Create and manage customers (delivery destinations) used in trip
          management.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-fg-muted">
            Stores can be created with profile information and helper
            requirements.
          </p>
        </div>
        <button
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
          onClick={openCreateModal}
        >
          Add Store
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by store name..."
          className="w-full sm:max-w-xs rounded-lg border border-border px-3 py-2 bg-surface text-fg"
        />
        <select
          value={profileFilter}
          onChange={(e) => setProfileFilter(e.target.value)}
          className="w-full sm:w-56 rounded-lg border border-border px-3 py-2 bg-surface text-fg"
        >
          <option value="ALL">All Profiles</option>
          {tripRateProfiles.map((profile) => (
            <option key={profile.id} value={profile.code}>
              {profile.profile_name}
            </option>
          ))}
        </select>
        {(searchTerm || profileFilter !== "ALL") && (
          <button
            className="text-sm text-fg-muted hover:text-fg underline underline-offset-2 sm:ml-auto"
            onClick={() => {
              setSearchTerm("");
              setProfileFilter("ALL");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-surface shadow-sm">
        {/* MOBILE: card list */}
        <div className="space-y-3 p-4 md:hidden">
          {loading ? (
            <div className="p-8 text-center text-fg-subtle">
              Loading stores...
            </div>
          ) : (
            renderMobileCards()
          )}
        </div>

        {/* DESKTOP: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Store Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Profile
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Required Helper
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Radius
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Coordinates
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-fg-subtle">
                    Loading stores...
                  </td>
                </tr>
              ) : (
                renderRows()
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalItems > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <span>
                Showing {startIndex + 1}–{endIndex} of {totalItems} stores
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="ml-2 rounded-lg border border-border px-2 py-1 text-sm bg-surface text-fg"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <MaintenanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStore ? "Edit Store" : "Add Store"}
        onSave={handleSaveStore}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Store Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
              placeholder="Store Name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">Latitude</label>
              <input
                type="number"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
                placeholder="Latitude"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Longitude
              </label>
              <input
                type="number"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: e.target.value })
                }
                className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
                placeholder="Longitude"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Allowed Radius (meters)
              </label>
              <input
                type="number"
                value={form.allowed_radius_meters}
                onChange={(e) =>
                  setForm({ ...form, allowed_radius_meters: e.target.value })
                }
                className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Required Helper
              </label>
              <input
                type="number"
                value={form.required_helper}
                onChange={(e) =>
                  setForm({ ...form, required_helper: e.target.value })
                }
                className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
                placeholder="0"
              />
              <p className="text-xs text-fg-subtle mt-1">
                Auto-filled based on profile — you can still override it.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Profile</label>
            {profilesLoading ? (
              <p className="text-sm text-fg-subtle">Loading profiles...</p>
            ) : (
              <select
                value={form.trip_rate_profile_id}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
              >
                <option value="">Select a profile</option>
                {tripRateProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profile_name} ({profile.helper_count} helper
                    {profile.helper_count === 1 ? "" : "s"})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </MaintenanceModal>
    </div>
  );
}
