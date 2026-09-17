import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import StoreLocationPicker from "../../components/adminTrips/StoreLocationPicker";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import {
  getOrigins,
  createOrigin,
  updateOrigin,
} from "../../api/adminTripManagement/origins";

const initialFormState = {
  name: "",
  latitude: "",
  longitude: "",
  allowed_radius_meters: 150,
};

// Origins (hubs/yards a driver dispatches from, and returns to for
// Checkin) -- previously only manageable as a buried "is_hub" checkbox
// on the Customers page. Still the same underlying Store rows
// (Store.is_hub = True); this is just a focused page for them, the
// same way Trip Category & Rates is its own page instead of living
// inside another form.
export default function OriginsPage() {
  const [origins, setOrigins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [saving, setSaving] = useState(false);

  const loadOrigins = async () => {
    try {
      const response = await getOrigins();
      setOrigins(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load origins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrigins();
  }, []);

  const openCreateModal = () => {
    setEditingOrigin(null);
    setForm(initialFormState);
    setShowModal(true);
  };

  const openEditModal = (origin) => {
    setEditingOrigin(origin);
    setForm({
      name: origin.name || "",
      latitude: origin.latitude ?? "",
      longitude: origin.longitude ?? "",
      allowed_radius_meters: origin.allowed_radius_meters || 150,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      allowed_radius_meters: Number(form.allowed_radius_meters),
    };

    if (!payload.name) {
      toast.error("Origin name is required.");
      return;
    }
    if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
      toast.error("Pick a location on the map, or enter valid coordinates.");
      return;
    }

    try {
      setSaving(true);
      if (editingOrigin) {
        await updateOrigin(editingOrigin.id, payload);
        toast.success("Origin updated.");
      } else {
        await createOrigin(payload);
        toast.success("Origin created.");
      }
      setShowModal(false);
      await loadOrigins();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Failed to save origin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Origins</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Hubs/yards a driver dispatches from, and must return to for
            Checkin.
          </p>
        </div>
        <button
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
          onClick={openCreateModal}
        >
          Add Origin
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-surface shadow-sm">
        {/* MOBILE: card list */}
        <div className="space-y-3 p-4 md:hidden">
          {loading ? (
            <div className="p-8 text-center text-fg-subtle">
              Loading origins...
            </div>
          ) : origins.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
              No origins yet.
            </div>
          ) : (
            origins.map((origin) => (
              <div
                key={origin.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-fg">{origin.name}</p>
                  <button
                    className="text-sm text-primary hover:text-primary-hover"
                    onClick={() => openEditModal(origin)}
                  >
                    Edit
                  </button>
                </div>
                <p className="mt-2 text-sm text-fg-muted">
                  {origin.latitude}, {origin.longitude}
                </p>
                <p className="text-xs text-fg-subtle">
                  Radius: {origin.allowed_radius_meters} m
                </p>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Coordinates
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Radius
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-fg-subtle">
                    Loading origins...
                  </td>
                </tr>
              ) : origins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-fg-subtle">
                    No origins yet.
                  </td>
                </tr>
              ) : (
                origins.map((origin) => (
                  <tr
                    key={origin.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-6 py-4 text-fg">{origin.name}</td>
                    <td className="px-6 py-4 text-fg-muted">
                      {origin.latitude}, {origin.longitude}
                    </td>
                    <td className="px-6 py-4 text-fg-muted">
                      {origin.allowed_radius_meters} m
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="text-primary hover:text-primary-hover"
                        onClick={() => openEditModal(origin)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MaintenanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingOrigin ? "Edit Origin" : "Add Origin"}
        onSave={handleSave}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Origin Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg"
              placeholder="e.g. Main Yard"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Pick Location on Map
            </label>
            <StoreLocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ lat, lng }) =>
                setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Latitude
              </label>
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
              placeholder="150"
            />
            <p className="mt-1 text-xs text-fg-subtle">
              How close a driver's GPS must be to count as "at this hub" --
              used for Checkin.
            </p>
          </div>

          {saving && (
            <p className="text-xs text-fg-subtle">Saving...</p>
          )}
        </div>
      </MaintenanceModal>
    </div>
  );
}
