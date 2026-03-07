import React, { useState, useMemo } from "react";
import { approveTrip, reviewTrip } from "../../api/adminTripManagement/trips";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  // faLocationDot,
  faStore,
  faClock,
  faRoute,
  faUserClock,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

/* Leaflet icon fix */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Auto map bounds */
const FitBounds = ({ coordinates }) => {
  const map = useMap();

  React.useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return null;
};

const PendingTripsCard = ({ trips = [], refreshTrips }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 5;

  const paginatedTrips = trips.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(trips.length / perPage);

  const handleReview = async (tripId) => {
    const res = await reviewTrip(tripId);
    setSelectedTrip(res.data);
    setShowModal(true);
  };

  const handleApprove = async () => {
    await approveTrip(selectedTrip.trip_id);
    setShowModal(false);
    refreshTrips();
  };

  const endIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const mapCoordinates = useMemo(() => {
    if (!selectedTrip) return [];

    const coords = [];

    // Start from origin
    if (selectedTrip.origin_lat && selectedTrip.origin_long) {
      coords.push([selectedTrip.origin_lat, selectedTrip.origin_long]);
    }

    // Add GPS logs
    if (selectedTrip.gps_logs) {
      selectedTrip.gps_logs
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .forEach((log) => {
          coords.push([log.actual_lat, log.actual_long]);
        });
    }

    return coords;
  }, [selectedTrip]);

  const endPoint = mapCoordinates.length
    ? mapCoordinates[mapCoordinates.length - 1]
    : null;

  return (
    <>
      {/* ======================= DESKTOP TABLE ======================= */}
      <div className="hidden md:block bg-[#023047] rounded-xl overflow-hidden">
        <table className="w-full text-sm text-white">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">Trip ID</th>
              <th className="px-6 py-3 text-left">Driver</th>
              <th className="px-6 py-3 text-left">Ticket</th>
              <th className="px-6 py-3 text-left">Start</th>
              <th className="px-6 py-3 text-left">Stops</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.map((trip) => (
              <tr key={trip.id} className="hover:bg-[#044a6d]">
                <td className="px-6 py-4">{trip.id}</td>
                <td className="px-6 py-4 capitalize">{trip.username}</td>
                <td className="px-6 py-4 uppercase">{trip.ticket_no}</td>
                <td className="px-6 py-4">{trip.start_time}</td>
                <td className="px-6 py-4">{trip.stops_count}</td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleReview(trip.id)}
                    className="bg-yellow-400 text-black px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================= MOBILE CARDS ======================= */}
      <div className="md:hidden flex flex-col gap-3">
        {paginatedTrips.map((trip) => (
          <div key={trip.id} className="bg-[#023047] text-white p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs opacity-70">Driver</p>
                <p className="font-semibold capitalize">{trip.username}</p>
              </div>

              <button
                onClick={() => handleReview(trip.id)}
                className="bg-yellow-400 text-black p-2 rounded-lg"
              >
                <FontAwesomeIcon icon={faEye} />
              </button>
            </div>

            <div className="mt-2 text-sm">
              <p className="opacity-70">Ticket</p>
              {trip.ticket_no}
            </div>

            <div className="flex justify-between mt-2 text-sm">
              <div>
                <p className="opacity-70">Start</p>
                {trip.start_time}
              </div>

              <div>
                <p className="opacity-70">Stops</p>
                {trip.stops_count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ======================= PAGINATION ======================= */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Prev
          </button>

          <span>
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Next
          </button>
        </div>
      )}

      {/* ======================= REVIEW MODAL ======================= */}
      {showModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center p-4 z-50 text-white">
          <div className="bg-[#023047] w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <FontAwesomeIcon icon={faRoute} />
                Trip Review — {selectedTrip.ticket_no}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>

            {/* BODY */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* MAP */}
              <div className="lg:w-3/5 h-80 lg:h-auto">
                <MapContainer
                  center={[10.3157, 123.8854]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="© OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* ORIGIN MARKER */}
                  {selectedTrip.origin_lat && (
                    <Marker
                      position={[
                        selectedTrip.origin_lat,
                        selectedTrip.origin_long,
                      ]}
                    >
                      <Popup>🚛 Origin: {selectedTrip.origin_store}</Popup>
                    </Marker>
                  )}

                  {/* STOP MARKERS */}
                  {selectedTrip.stops.map((stop, index) =>
                    stop.lat_in ? (
                      <Marker
                        key={index}
                        position={[stop.lat_in, stop.long_in]}
                      >
                        <Popup>
                          📍 {stop.store_name}
                          <br />
                          Check-In: {stop.check_in_time}
                          <br />
                          Check-Out: {stop.check_out_time}
                        </Popup>
                      </Marker>
                    ) : null,
                  )}

                  {/* END MARKER */}
                  {endPoint && (
                    <Marker position={endPoint} icon={endIcon}>
                      <Popup>🏁 Trip End</Popup>
                    </Marker>
                  )}

                  {/* GPS ROUTE */}
                  {mapCoordinates.length > 1 && (
                    <Polyline
                      positions={mapCoordinates}
                      pathOptions={{
                        color: "blue",
                        weight: 4,
                        dashArray: "6,8",
                      }}
                    />
                  )}

                  <FitBounds coordinates={mapCoordinates} />
                </MapContainer>
              </div>

              {/* DETAILS */}
              <div className="lg:w-2/5 overflow-y-auto p-6">
                {/* DRIVER */}
                <div className="flex items-center gap-3 mb-6 text-lg">
                  <FontAwesomeIcon icon={faUser} />
                  {selectedTrip.driver_first_name}{" "}
                  {selectedTrip.driver_last_name}
                  <span className="text-gray-300 text-sm ml-2">[ Driver ]</span>
                </div>

                {/* HELPERS */}
                {selectedTrip.helpers?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm mb-2">Helpers</p>

                    <div className="flex flex-wrap gap-2">
                      {selectedTrip.helpers.map((helper) => (
                        <span
                          key={helper.id}
                          className="bg-gray-200 text-black px-3 py-1 rounded-full text-sm"
                        >
                          {helper.first_name} {helper.last_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* TRIP INFO */}
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-300">Origin</p>
                    <p>{selectedTrip.origin_store}</p>
                  </div>

                  <div>
                    <p className="text-sm">
                      <FontAwesomeIcon icon={faUserClock} className="mr-2" />
                      Start
                    </p>
                    {selectedTrip.start_time}
                  </div>

                  <div>
                    <p className="text-sm">
                      <FontAwesomeIcon icon={faUserClock} className="mr-2" />
                      End
                    </p>
                    {selectedTrip.end_time}
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Start Photo</p>

                    {selectedTrip.start_photo ? (
                      <button
                        onClick={() => setShowPhoto(true)}
                        className="text-yellow-400 underline text-sm"
                      >
                        See Attached Photo
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">No Photo</span>
                    )}
                  </div>
                </div>

                <hr className="mb-6" />

                {/* STOPS */}
                <h3 className="font-semibold text-lg mb-4">Visited Stops</h3>

                <div className="space-y-3 text-black">
                  {selectedTrip.stops.map((stop, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border rounded-xl p-4"
                    >
                      <p className="font-semibold">
                        <FontAwesomeIcon icon={faStore} className="mr-2" />
                        {stop.store_name}
                      </p>

                      <p className="text-sm">
                        <FontAwesomeIcon icon={faClock} className="mr-2" />
                        Check-In: {stop.check_in_time || "-"}
                      </p>

                      <p className="text-sm">
                        <FontAwesomeIcon icon={faClock} className="mr-2" />
                        Check-Out: {stop.check_out_time || "-"}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleApprove}
                  className="mt-6 bg-yellow-400 text-black py-3 w-full rounded-xl font-bold"
                >
                  Approve Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl max-w-lg w-full">
            <img
              src={`http://127.0.0.1:8000/${selectedTrip.start_photo}`}
              alt="Trip Start"
              className="w-full rounded-lg"
            />

            <button
              onClick={() => setShowPhoto(false)}
              className="mt-4 bg-yellow-400 w-full py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingTripsCard;
