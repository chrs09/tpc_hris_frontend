import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState(null);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        !e.target.closest("[data-searchable-dropdown]")
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      if (inputRef.current) {
        setRect(inputRef.current.getBoundingClientRect());
      }
    };

    updateRect();

    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={wrapperRef}>
      <input
        ref={inputRef}
        value={open ? query : value?.label || ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        className="w-full rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-slate-800 focus:border-amber-400 focus:bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
      />

      {open &&
        rect &&
        createPortal(
          <div
            data-searchable-dropdown
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
              width: Math.max(rect.width, 220),
            }}
            className="z-9999 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-2 text-left hover:bg-amber-50 ${
                    value?.id === opt.id ? "bg-amber-50 text-amber-700" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
