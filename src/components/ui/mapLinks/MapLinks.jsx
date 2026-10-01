import { useState } from "react";
import toast from "react-hot-toast";

// Google Maps shortcuts for a location: Directions, Open in Maps (the
// pin) and Copy. Plain Google Maps links -- no API key needed. Renders
// nothing without coordinates.
//
// Directions start from a hub (`origins`, e.g. the Plant) when given --
// `defaultOriginId` picks which; the full version lets you switch hubs or
// use "My location" (route from wherever the device is).
const hasCoords = (lat, lng) =>
  lat !== null &&
  lat !== undefined &&
  lat !== "" &&
  lng !== null &&
  lng !== undefined &&
  lng !== "" &&
  !Number.isNaN(Number(lat)) &&
  !Number.isNaN(Number(lng));

const directionsUrl = (lat, lng, origin) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${
    origin ? `&origin=${origin.latitude},${origin.longitude}` : ""
  }&travelmode=driving`;

const pinUrl = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const MY_LOCATION = "me";

export default function MapLinks({
  latitude,
  longitude,
  compact = false,
  origins = [],
  defaultOriginId = null,
}) {
  const usableOrigins = origins.filter((o) => hasCoords(o.latitude, o.longitude));
  const [originId, setOriginId] = useState(
    defaultOriginId && usableOrigins.some((o) => o.id === defaultOriginId)
      ? defaultOriginId
      : MY_LOCATION,
  );

  if (!hasCoords(latitude, longitude)) return null;

  const origin = usableOrigins.find((o) => o.id === originId) || null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${latitude}, ${longitude}`);
      toast.success("Coordinates copied.");
    } catch {
      toast.error("Couldn't copy -- select the coordinates instead.");
    }
  };

  const linkClass = compact
    ? "text-xs font-medium text-primary hover:underline"
    : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover";

  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-x-3 gap-y-1" : "gap-2"}`}>
      {!compact && usableOrigins.length > 0 && (
        <label className="flex items-center gap-1.5 text-xs text-fg-subtle">
          From
          <select
            value={originId}
            onChange={(e) =>
              setOriginId(e.target.value === MY_LOCATION ? MY_LOCATION : Number(e.target.value))
            }
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-fg"
          >
            {usableOrigins.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            <option value={MY_LOCATION}>My location</option>
          </select>
        </label>
      )}
      <a
        href={directionsUrl(latitude, longitude, origin)}
        target="_blank"
        rel="noopener noreferrer"
        className={
          compact
            ? linkClass
            : "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
        }
        title={
          origin
            ? `Route from ${origin.name}, in Google Maps`
            : "Route from where you are, in Google Maps"
        }
      >
        🧭 {origin && compact ? `From ${origin.name}` : "Directions"}
      </a>
      <a
        href={pinUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Open in Maps
      </a>
      <button type="button" onClick={copy} className={linkClass}>
        Copy
      </button>
    </div>
  );
}
