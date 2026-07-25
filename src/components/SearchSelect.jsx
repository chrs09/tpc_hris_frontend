import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SearchSelect({
  value = null,
  options = [],
  onChange,
  placeholder = "Select",
  disabled = false,
  getOptionLabel = (option) => option?.label ?? option?.name ?? String(option ?? ""),
  getOptionValue = (option) => option?.value ?? option?.id ?? option,
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

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
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

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return options.filter((option) => {
      const label = getOptionLabel(option).toString().toLowerCase();
      return label.includes(normalizedQuery);
    });
  }, [options, query, getOptionLabel]);

  const handleSelect = (option) => {
    if (disabled) return;

    onChange?.(option);
    setOpen(false);
    setQuery("");
  };

  const selectedLabel = value ? getOptionLabel(value) : "";
  const selectedValue = value ? getOptionValue(value) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={inputRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex min-h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "border-gray-300 bg-white hover:border-[#2b2b2b]"
        }`}
      >
        <span className={selectedLabel ? "text-gray-800" : "text-gray-400"}>
          {selectedLabel || placeholder}
        </span>

        <span className="text-gray-400">▾</span>
      </button>

      {open && rect && createPortal(
        <div
          data-searchable-dropdown
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 260),
          }}
          className="z-9999 rounded-lg border bg-white shadow-lg"
        >
          <div className="border-b p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded border px-2 py-1 text-sm focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-slate-400">No results</div>
            ) : (
              filtered.map((option) => {
                const isActive = selectedValue !== null && getOptionValue(option) === selectedValue;

                return (
                  <button
                    key={getOptionValue(option)}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      isActive ? "bg-gray-50 font-medium" : ""
                    }`}
                  >
                    <span>{getOptionLabel(option)}</span>
                    {isActive && <span className="text-[#2b2b2b]">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
