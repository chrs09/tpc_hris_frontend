import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SearchableMultiSelect({
  value = [],
  options = [],
  onChange,
  placeholder = "Select",
  disabled = false,
  maxSelection = Infinity,
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
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase()),
    );
  }, [options, query]);

  const isSelected = (option) => value.some((v) => v.id === option.id);

  const toggleOption = (option) => {
    if (disabled) return;

    if (isSelected(option)) {
      onChange(value.filter((v) => v.id !== option.id));
      return;
    }

    if (value.length >= maxSelection) {
      return;
    }

    onChange([...value, option]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        ref={inputRef}
        onClick={() => !disabled && setOpen(true)}
        className={`min-h-9.5 w-full rounded-md border px-2 py-1 cursor-pointer ${
          disabled
            ? "bg-slate-100 text-slate-400"
            : "border-transparent bg-transparent hover:border-amber-300"
        }`}
      >
        {value.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {value.map((item) => (
              <span
                key={item.id}
                className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
              >
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {open &&
        rect &&
        createPortal(
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
                  const checked = isSelected(option);

                  const limitReached = !checked && value.length >= maxSelection;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option)}
                      disabled={limitReached}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-amber-50 ${
                        limitReached ? "cursor-not-allowed opacity-40" : ""
                      }`}
                    >
                      <span>{option.label}</span>

                      <input type="checkbox" checked={checked} readOnly />
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t px-3 py-2 text-xs text-slate-500">
              {disabled
                ? "No helper required"
                : `${value.length} / ${maxSelection} selected`}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
