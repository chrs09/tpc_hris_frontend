import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "react-hot-toast";

/* Leaflet icon fix -- same pattern as PendingTripsCard.jsx/TripGpsLogsModal.jsx */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Cebu City -- matches the default map center already used elsewhere in
// this codebase (PendingTripsCard.jsx) for a sensible starting view.
const DEFAULT_CENTER = [10.3157, 123.8854];

const reverseGeocode = async (lat, lng) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
  );
  if (!res.ok) throw new Error("Reverse geocode failed");
  const data = await res.json();
  return data.display_name || "";
};

const FlyTo = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);
  return null;
};

const ClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// A small Leaflet + OpenStreetMap picker (no API key needed) -- click
// the map or drag the pin to set a store's coordinates, and its address
// is auto-filled via OSM's free Nominatim reverse-geocoding (still
// editable afterward, since it isn't always exact for smaller
// outlets). Includes a search box (forward geocoding) to jump the map
// to a typed address/place name first.
export default function StoreLocationPicker({ latitude, longitude, onChange }) {
  const hasPosition =
    latitude !== "" && longitude !== "" && !isNaN(latitude) && !isNaN(longitude);
  const position = hasPosition ? [Number(latitude), Number(longitude)] : null;

  const [flyTarget, setFlyTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const pick = async (lat, lng) => {
    onChange({ lat, lng });
    try {
      const address = await reverseGeocode(lat, lng);
      if (address) onChange({ lat, lng, address });
    } catch {
      // Reverse geocoding is a nice-to-have -- the coordinates are
      // already set either way, so a failure here isn't fatal.
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          searchQuery,
        )}`,
      );
      const results = await res.json();
      if (!results.length) {
        toast.error("No matching location found.");
        return;
      }
      const { lat, lon, display_name } = results[0];
      setFlyTarget([Number(lat), Number(lon)]);
      onChange({ lat: Number(lat), lng: Number(lon), address: display_name });
    } catch {
      toast.error("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Search an address or place name..."
          className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-fg text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      <div className="h-56 overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? 16 : 12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pick} />
          <FlyTo position={flyTarget} />
          {position && (
            <Marker
              position={position}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  pick(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-fg-subtle">
        Click the map (or drag the pin) to set the store's exact location --
        the address below auto-fills, but double-check it since it isn't
        always exact.
      </p>
    </div>
  );
}
