import React, { useState, useEffect } from "react";
import {
  getActiveTrip,
  startTrip,
  checkIn,
  checkOut,
  completeTrip,
  getAvailableHelpers,
} from "../../api/tripManagement";

const DriverDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticketNo, setTicketNo] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [photo, setPhoto] = useState(null);

  const [helpers, setHelpers] = useState([]);
  const [selectedHelpers, setSelectedHelpers] = useState([]);

  const driverName = localStorage.getItem("username") || "Driver";

  const loadTrip = async () => {
    try {
      const res = await getActiveTrip();
      setTripData(res);

      if (!res.active_trip) {
        const helperRes = await getAvailableHelpers();
        setHelpers(helperRes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject("Geolocation not supported");

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            long: position.coords.longitude,
          }),
        () => reject("Location permission denied"),
      );
    });

  const handleAddHelper = () => {
    if (selectedHelpers.length >= 3) return;
    setSelectedHelpers([...selectedHelpers, null]);
  };

  const handleHelperChange = (index, value) => {
    const updated = [...selectedHelpers];
    updated[index] = value ? Number(value) : null;
    setSelectedHelpers(updated);
  };

  const handleRemoveHelper = (index) => {
    const updated = selectedHelpers.filter((_, i) => i !== index);
    setSelectedHelpers(updated);
  };

  const handleStartTrip = async () => {
    if (!ticketNo.trim()) {
      alert("Ticket number required");
      return;
    }

    if (!photo) {
      alert("Start trip photo is required");
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();

      // await startTrip({
      //   ticket_no: ticketNo.trim(),
      //   ...location,
      //   helper_ids: selectedHelpers.filter(Boolean),
      // });
      const formData = new FormData();

      formData.append("ticket_no", ticketNo.trim());
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append(
        "helper_ids",
        JSON.stringify(selectedHelpers.filter(Boolean)),
      );
      formData.append("photo", photo);

      await startTrip(formData);

      setTicketNo("");
      setSelectedHelpers([]);
      setPhoto(null);
      await loadTrip();
    } catch (error) {
      alert(error.response?.data?.detail || error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      await checkIn(tripData.active_trip.id, location);
      await loadTrip();
    } catch (error) {
      alert(error.response?.data?.detail || error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      await checkOut(
        tripData.active_trip.id,
        tripData.latest_stop.id,
        location,
      );
      await loadTrip();
    } catch (error) {
      alert(error.response?.data?.detail || error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      await completeTrip(tripData.active_trip.id, location);
      await loadTrip();
    } catch (error) {
      alert(error.response?.data?.detail || error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const trip = tripData?.active_trip;
  const hasOpenStop = tripData?.has_open_stop;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* HEADER CARD */}
      <div className="bg-[#023047] text-white rounded-3xl p-5 sm:p-6 lg:p-8 shadow-lg mb-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {getGreeting()}, {driverName} 👋
            </h1>
            <p className="text-blue-200 text-sm">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-sm text-blue-200">Current Time</p>
            <p className="text-lg sm:text-xl font-semibold">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* CONTENT CARD */}
        <div className="bg-white text-gray-800 rounded-2xl p-4 sm:p-6 mt-6 shadow-md">
          {!trip ? (
            <>
              {/* START TRIP INPUT */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Enter Ticket Number"
                  value={ticketNo}
                  onChange={(e) => setTicketNo(e.target.value)}
                  className="flex-1 border p-3 rounded-xl"
                />
                {/* PHOTO UPLOAD */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Start Trip Photo
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhoto(e.target.files[0])}
                    className="w-full border p-2 rounded-lg"
                  />
                </div>

                <button
                  onClick={handleStartTrip}
                  disabled={actionLoading || !ticketNo.trim()}
                  className="bg-yellow-400 px-6 py-3 rounded-xl font-semibold w-full sm:w-auto"
                >
                  {actionLoading ? "Processing..." : "Start Trip"}
                </button>
              </div>

              {/* HELPERS */}
              <div className="space-y-3">
                {selectedHelpers.map((helper, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <select
                      className="flex-1 border p-2 rounded-lg"
                      value={helper ?? ""}
                      onChange={(e) =>
                        handleHelperChange(index, e.target.value)
                      }
                    >
                      <option value="">Select Helper</option>

                      {helpers
                        .filter(
                          (h) =>
                            h.id === helper || !selectedHelpers.includes(h.id),
                        )
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.first_name} {h.last_name}
                          </option>
                        ))}
                    </select>

                    <button
                      onClick={() => handleRemoveHelper(index)}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {selectedHelpers.length < 3 && (
                  <button
                    onClick={handleAddHelper}
                    className="bg-blue-500 text-white px-4 py-2 rounded-xl shadow w-full sm:w-auto"
                  >
                    + Add Helper
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold mb-4">Ticket No: {trip.ticket_no}</p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                {!hasOpenStop && (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="bg-[#023047] text-white px-6 py-3 rounded-xl w-full sm:w-auto"
                  >
                    Check-In
                  </button>
                )}

                {hasOpenStop && (
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="bg-yellow-500 text-white px-6 py-3 rounded-xl w-full sm:w-auto"
                  >
                    Check-Out
                  </button>
                )}

                {!hasOpenStop && (
                  <button
                    onClick={handleCompleteTrip}
                    disabled={actionLoading}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl w-full sm:w-auto"
                  >
                    Complete Trip
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
