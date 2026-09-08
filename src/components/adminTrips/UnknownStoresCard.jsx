import { useState } from "react";
import { approveStoreFromStop } from "../../api/adminTripManagement/stores";

const UnknownStoresCard = ({ stops = [], onApproved }) => {
  const [selectedStop, setSelectedStop] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [radius, setRadius] = useState(100);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const openModal = (stop) => {
    setSelectedStop(stop);
    setStoreName("");
    setRadius(100);
    setSuccessMessage("");
  };

  const closeModal = () => {
    setSelectedStop(null);
    setStoreName("");
    setRadius(100);
    setSuccessMessage("");
  };

  const handleApprove = async () => {
    if (!storeName.trim()) return;

    try {
      setLoading(true);

      await approveStoreFromStop(selectedStop.stop_id, {
        name: storeName,
        allowed_radius_meters: radius,
      });

      setSuccessMessage("Store approved successfully.");

      if (onApproved) {
        onApproved(selectedStop.stop_id);
      }

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (err) {
      setSuccessMessage(
        err.response?.data?.detail || "Failed to approve store.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full table-fixed text-sm text-fg">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="w-[25%] px-6 py-3 text-left font-medium">Driver</th>

              <th className="w-[40%] px-6 py-3 text-left font-medium">Coordinates</th>

              <th className="w-[20%] px-6 py-3 text-left font-medium">Store Name</th>

              <th className="w-[15%] px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {stops.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-fg-subtle">
                  No unknown check-ins
                </td>
              </tr>
            ) : (
              stops.map((stop) => (
                <tr key={stop.stop_id} className="hover:bg-surface-hover">
                  <td className="px-6 py-4 capitalize">{stop.username}</td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {stop.lat_in}, {stop.long_in}
                  </td>

                  <td className="px-6 py-4">Unknown Store</td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(stop)}
                      className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg text-primary-foreground text-sm transition cursor-pointer"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARDS ================= */}
      <div className="md:hidden flex flex-col gap-3">
        {stops.length === 0 ? (
          <div className="text-center text-fg-subtle py-6">
            No unknown check-ins
          </div>
        ) : (
          stops.map((stop) => (
            <div
              key={stop.stop_id}
              className="bg-surface border border-border text-fg p-4 rounded-xl shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold capitalize">{stop.username}</p>

                  <p className="text-xs text-fg-muted mt-1">Coordinates</p>

                  <p className="text-sm">
                    {stop.lat_in}, {stop.long_in}
                  </p>

                  <p className="text-sm text-fg-muted mt-2">Unknown Store</p>
                </div>

                <button
                  onClick={() => openModal(stop)}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-2 rounded-lg text-sm"
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= MODAL ================= */}
      {selectedStop && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-fg">
              Approve Unknown Store
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-fg-muted mb-1">
                  Store Name
                </label>

                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-fg-muted mb-1">
                  Allowed Radius (meters)
                </label>

                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {successMessage && (
              <div className="mt-4 text-success text-sm">
                {successMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={loading}
                className="px-4 py-2 border border-border bg-surface hover:bg-surface-hover rounded-lg text-sm text-fg cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm cursor-pointer"
              >
                {loading ? "Saving..." : "Approve & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnknownStoresCard;
