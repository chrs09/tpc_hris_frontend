import { useEffect, useState } from "react";
import { getNoScheduleLabel } from "../api/scheduleTemplates";

// The name for "no work schedule" (blank) -- e.g. "Per Trip" for drivers
// and helpers who aren't on fixed work hours. Set on the Work Schedules
// page; shown wherever a blank schedule would show "-". Loaded once and
// shared; setNoScheduleLabel() updates every screen using it.
const DEFAULT_LABEL = "Per Trip";
let cached = null;
let pending = null;
const listeners = new Set();

export function setNoScheduleLabel(label) {
  cached = label;
  listeners.forEach((fn) => fn(label));
}

export default function useNoScheduleLabel() {
  const [label, setLabel] = useState(cached || DEFAULT_LABEL);

  useEffect(() => {
    listeners.add(setLabel);
    if (!cached) {
      pending =
        pending ||
        getNoScheduleLabel()
          .then((data) => setNoScheduleLabel(data?.label || DEFAULT_LABEL))
          .catch(() => {
            pending = null;
          });
    }
    return () => listeners.delete(setLabel);
  }, []);

  return label;
}
