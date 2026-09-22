import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import {
  getStores,
  createStore,
  updateStore,
  uploadStorePhoto,
  removeStorePhoto,
  getTripRateProfilesAdmin, // NEW - fetches real TripRateProfile rows
} from "../../api/adminTripManagement/stores";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import StoreLocationPicker from "../../components/adminTrips/StoreLocationPicker";
import SearchSelect from "../../components/SearchSelect";

const initialFormState = {
  name: "",
  address: "",
  outlet_number: "",
  latitude: "",
  longitude: "",
  allowed_radius_meters: 100,
  required_helper: 0,
  trip_rate_profile_id: "",
};

// Full-size photo preview, shared by the store list and the edit modal.
const ImagePreviewOverlay = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label="Store photo preview"
  >
    <button
      type="button"
      onClick={onClose}
      aria-label="Close photo preview"
      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl text-white transition hover:bg-black"
    >
      ×
    </button>
    <img
      src={url}
      alt=""
      onClick={(e) => e.stopPropagation()}
      className="max-h-[90vh] max-w-full rounded-xl object-contain"
    />
  </div>
);

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

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowModal(true);
  };

  const openEditModal = (store) => {
    // The stores list only returns a resolved profile name (store.profile),
    // not the numeric trip_rate_profile_id, so we look it up here.
    const matchedProfile = tripRateProfiles.find(
      (p) => p.code === store.profile,
    );
    setEditingStore(store);
    setPhotoFile(null);
    setPhotoPreview(store.photo_url || null);
    setForm({
      name: store.name || "",
      address: store.address || "",
      outlet_number: store.outlet_number || "",
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

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveStore = async () => {
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        outlet_number: form.outlet_number.trim() || null,
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

      let storeId = editingStore?.id;

      if (editingStore) {
        await updateStore(editingStore.id, payload);
        toast.success("Store updated successfully.");
      } else {
        const created = await createStore(payload);
        storeId = created?.data?.id;
        toast.success("Store created successfully.");
      }

      if (photoFile && storeId) {
        try {
          setUploadingPhoto(true);
          await uploadStorePhoto(storeId, photoFile);
        } catch (photoError) {
          toast.error(
            `Store saved, but the photo failed to upload: ${
              photoError?.response?.data?.detail || photoError.message
            }`,
          );
        } finally {
          setUploadingPhoto(false);
        }
      }

      setShowModal(false);
      await loadStores();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Failed to save store.");
    }
  };

  const handleRemovePhoto = async () => {
    if (!editingStore) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    try {
      setUploadingPhoto(true);
      await removeStorePhoto(editingStore.id);
      setPhotoFile(null);
      setPhotoPreview(null);
      await loadStores();
      toast.success("Photo removed.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove photo.");
    } finally {
      setUploadingPhoto(false);
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
          <td colSpan={9} className="px-6 py-4 text-center text-fg-subtle">
            {stores.length
              ? "No stores match your search or filter."
              : "No stores found."}
          </td>
        </tr>
      );
    }

    return paginatedStores.map((store) => (
      <tr key={store.id} className="border-b border-border last:border-b-0">
        <td className="px-6 py-4">
          {store.photo_url ? (
            <img
              src={store.photo_url}
              alt=""
              onClick={() => setPreviewUrl(store.photo_url)}
              className="h-10 w-10 cursor-zoom-in rounded-lg object-cover"
            />
          ) : (
            <span className="text-xs text-fg-subtle">No photo</span>
          )}
        </td>
        <td className="px-6 py-4 text-fg">{store.name}</td>
        <td className="px-6 py-4 text-fg-muted">{store.outlet_number || "-"}</td>
        <td className="px-6 py-4 text-fg-muted max-w-xs truncate">
          {store.address || "-"}
        </td>
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
          <div className="flex items-start gap-3">
            {store.photo_url && (
              <img
                src={store.photo_url}
                alt=""
                onClick={() => setPreviewUrl(store.photo_url)}
                className="h-12 w-12 shrink-0 cursor-zoom-in rounded-lg object-cover"
              />
            )}
            <div>
              <p className="font-semibold text-fg">{store.name}</p>
              <p className="text-xs text-fg-subtle">
                {store.profile || "Unassigned"}
              </p>
              {store.outlet_number && (
                <p className="text-xs text-fg-subtle">
                  Outlet #{store.outlet_number}
                </p>
              )}
            </div>
          </div>

          <button
            className="text-sm text-primary hover:text-primary-hover"
            onClick={() => openEditModal(store)}
          >
            Edit
          </button>
        </div>

        {store.address && (
          <p className="mt-2 text-xs text-fg-muted">{store.address}</p>
        )}

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
        <div className="w-full sm:w-56">
          <SearchSelect
            value={
              [
                { value: "ALL", label: "All Profiles" },
                ...tripRateProfiles.map((profile) => ({
                  value: profile.code,
                  label: profile.profile_name,
                })),
              ].find((option) => option.value === profileFilter) || null
            }
            options={[
              { value: "ALL", label: "All Profiles" },
              ...tripRateProfiles.map((profile) => ({
                value: profile.code,
                label: profile.profile_name,
              })),
            ]}
            onChange={(option) => setProfileFilter(option?.value ?? "ALL")}
            placeholder="All Profiles"
          />
        </div>
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
                  Photo
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Store Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Outlet #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Address
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
                  <td colSpan={9} className="px-6 py-8 text-center text-fg-subtle">
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
              <div className="ml-2 inline-block w-28 align-middle">
                <SearchSelect
                  value={
                    [
                      { value: 10, label: "10 / page" },
                      { value: 25, label: "25 / page" },
                      { value: 50, label: "50 / page" },
                      { value: 100, label: "100 / page" },
                    ].find((option) => option.value === itemsPerPage) || null
                  }
                  options={[
                    { value: 10, label: "10 / page" },
                    { value: 25, label: "25 / page" },
                    { value: 50, label: "50 / page" },
                    { value: 100, label: "100 / page" },
                  ]}
                  onChange={(option) => setItemsPerPage(Number(option.value))}
                  placeholder="Per page"
                />
              </div>
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

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
              placeholder="e.g. 123 Main St., Cebu City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Outlet Number
            </label>
            <input
              value={form.outlet_number}
              onChange={(e) =>
                setForm({ ...form, outlet_number: e.target.value })
              }
              className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
              placeholder="e.g. OUT-0042"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Store Photo
            </label>

            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt=""
                  onClick={() => setPreviewUrl(photoPreview)}
                  className="h-32 w-full cursor-zoom-in rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingPhoto}
                onChange={handlePhotoChange}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground disabled:opacity-50"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Pick Location on Map
            </label>
            <StoreLocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ lat, lng, address }) =>
                setForm((prev) => ({
                  ...prev,
                  latitude: lat,
                  longitude: lng,
                  ...(address !== undefined ? { address } : {}),
                }))
              }
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
              <SearchSelect
                value={tripRateProfiles.find(
                  (p) => String(p.id) === String(form.trip_rate_profile_id),
                )}
                options={tripRateProfiles}
                onChange={(profile) => handleProfileChange(profile?.id || "")}
                placeholder="Select a profile"
                getOptionLabel={(profile) =>
                  profile
                    ? `${profile.profile_name} (${profile.helper_count} helper${
                        profile.helper_count === 1 ? "" : "s"
                      })`
                    : ""
                }
                getOptionValue={(profile) => profile?.id}
              />
            )}
          </div>
        </div>
      </MaintenanceModal>

      {previewUrl && (
        <ImagePreviewOverlay
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
}
