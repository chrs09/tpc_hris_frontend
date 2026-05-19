import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const AttendancePreviewModal = ({ previewModal, setPreviewModal }) => {
  if (!previewModal) return null;

  const { attendance, type } = previewModal;
  const isTimeIn = type === "timein";

  const photoUrl = isTimeIn
    ? attendance.time_in_photo_url
    : attendance.time_out_photo_url;

  const latitude = Number(
    isTimeIn ? attendance.time_in_latitude : attendance.time_out_latitude,
  );

  const longitude = Number(
    isTimeIn ? attendance.time_in_longitude : attendance.time_out_longitude,
  );

  const address = isTimeIn
    ? attendance.time_in_address
    : attendance.time_out_address;

  const time = isTimeIn
    ? attendance.check_in_time
    : attendance.check_out_time;

  const hasLocation = !Number.isNaN(latitude) && !Number.isNaN(longitude);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">
            {isTimeIn ? "Time In Preview" : "Time Out Preview"}
          </h2>

          <button
            onClick={() => setPreviewModal(null)}
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <div>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Attendance proof"
                className="w-full h-105 object-cover rounded-xl border"
              />
            ) : (
              <div className="w-full h-105 rounded-xl border flex items-center justify-center text-gray-500">
                No photo available
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="h-70 rounded-xl overflow-hidden border">
              {hasLocation ? (
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={18}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="© OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker position={[latitude, longitude]}>
                    <Popup>{address || "Attendance location"}</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No location available
                </div>
              )}
            </div>

            <div className="bg-gray-100 rounded-xl p-4 text-sm space-y-2">
              <p>
                <strong>Time:</strong> {time || "--"}
              </p>

              <p>
                <strong>Coordinates:</strong>{" "}
                {hasLocation ? `${latitude}, ${longitude}` : "--"}
              </p>

              <p>
                <strong>Address:</strong> {address || "--"}
              </p>

              {hasLocation && (
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-blue-600 underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePreviewModal;