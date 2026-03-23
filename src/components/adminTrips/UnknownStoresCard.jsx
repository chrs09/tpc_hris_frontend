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
      <div className="hidden md:block bg-[#2b2b2b] rounded-xl overflow-hidden">
        <table className="w-full table-fixed text-sm text-white">
          <thead>
            <tr>
              <th className="w-[25%] px-6 py-3 text-left">Driver</th>

              <th className="w-[40%] px-6 py-3 text-left">Coordinates</th>

              <th className="w-[20%] px-6 py-3 text-left">Store Name</th>

              <th className="w-[15%] px-6 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-600 bg-[#b3b3b3] text-black">
            {stops.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-gray-300">
                  No unknown check-ins
                </td>
              </tr>
            ) : (
              stops.map((stop) => (
                <tr key={stop.stop_id} className="hover:bg-[#a09f9f]">
                  <td className="px-6 py-4 capitalize">{stop.username}</td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {stop.lat_in}, {stop.long_in}
                  </td>

                  <td className="px-6 py-4">Unknown Store</td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(stop)}
                      className="bg-[#2b2b2b] hover:bg-[#333333] px-4 py-2 rounded-lg text-white text-sm transition cursor-pointer"
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
          <div className="text-center text-gray-400 py-6">
            No unknown check-ins
          </div>
        ) : (
          stops.map((stop) => (
            <div
              key={stop.stop_id}
              className="bg-[#2b2b2b] text-white p-4 rounded-xl shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold capitalize">{stop.username}</p>

                  <p className="text-xs text-gray-300 mt-1">Coordinates</p>

                  <p className="text-sm">
                    {stop.lat_in}, {stop.long_in}
                  </p>

                  <p className="text-sm text-gray-300 mt-2">Unknown Store</p>
                </div>

                <button
                  onClick={() => openModal(stop)}
                  className="bg-blue-600 px-3 py-2 rounded-lg text-sm"
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
          <div className="bg-[#2b2b2b] rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Approve Unknown Store
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white mb-1">
                  Store Name
                </label>

                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white mb-1">
                  Allowed Radius (meters)
                </label>

                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {successMessage && (
              <div className="mt-4 text-green-600 text-sm">
                {successMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={loading}
                className="px-4 py-2 border bg-white hover:bg-gray-300 rounded-lg text-sm cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-4 py-2 bg-yellow-400 hover:bg-[#d18f0c] text-black rounded-lg text-sm cursor-pointer"
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
