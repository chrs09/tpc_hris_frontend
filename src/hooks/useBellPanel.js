import { useCallback, useEffect, useId, useRef, useState } from "react";

// Open state for an alerts bell's dropdown. Only one bell panel is open at
// a time: opening one tells the others (window "bell-panel-open") to close,
// so the panels never stack on top of each other.
const EVENT = "bell-panel-open";

export default function useBellPanel() {
  const id = useId();
  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    const closeIfOther = (event) => {
      if (event.detail !== id && openRef.current) {
        openRef.current = false;
        setOpenState(false);
      }
    };
    window.addEventListener(EVENT, closeIfOther);
    return () => window.removeEventListener(EVENT, closeIfOther);
  }, [id]);

  const setOpen = useCallback(
    (next) => {
      const value = typeof next === "function" ? next(openRef.current) : next;
      openRef.current = value;
      setOpenState(value);
      if (value) window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
    },
    [id],
  );

  return [open, setOpen];
}
