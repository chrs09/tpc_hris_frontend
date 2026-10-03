import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Palette } from "lucide-react";
import useTheme from "../../hooks/useTheme";
import { ACCENT_PRESETS, DEFAULT_ACCENT } from "../../utils/theme/accent";

const MODES = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["system", "Device"],
];

// Palette button: pick an accent colour (presets or any colour) and
// light / dark / follow-the-device. Saved on the person's account.
export default function ThemeCustomizer({ className = "" }) {
  const { mode, accent, setMode, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const buttonRef = useRef(null);
  const current = (accent || DEFAULT_ACCENT).toLowerCase();

  // Fixed-position panel (the sidebar clips absolutely-positioned ones).
  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      if (!buttonRef.current) return;
      const r = buttonRef.current.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 32);
      const left = Math.min(Math.max(r.left, 16), window.innerWidth - width - 16);
      setRect({ top: r.bottom + 8, left, width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Customize theme"
        title="Customize theme"
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg ${className}`}
      >
        <Palette size={16} />
      </button>

      {open &&
        rect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
              className="z-50 space-y-4 rounded-xl border border-border bg-surface p-4 shadow-xl"
            >
              <div>
                <p className="text-sm font-semibold text-fg">Theme</p>
                <p className="text-xs text-fg-subtle">Saved to your account.</p>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-fg-muted">Mode</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-hover p-1">
                  {MODES.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                        mode === key
                          ? "bg-primary text-primary-foreground"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-fg-muted">Accent colour</p>
                <div className="grid grid-cols-5 gap-2">
                  {ACCENT_PRESETS.map((preset) => {
                    const on = current === preset.hex;
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        title={preset.name}
                        aria-label={preset.name}
                        onClick={() => setAccent(preset.hex === DEFAULT_ACCENT ? null : preset.hex)}
                        className={`flex h-9 w-full items-center justify-center rounded-lg ring-offset-2 ring-offset-surface ${
                          on ? "ring-2 ring-fg" : ""
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {on && <Check size={14} className="text-white" />}
                      </button>
                    );
                  })}
                  <label
                    title="Pick any colour"
                    className="relative flex h-9 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border text-[10px] font-semibold text-fg-muted"
                  >
                    Custom
                    <input
                      type="color"
                      value={current}
                      onChange={(e) => setAccent(e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs text-fg-muted">
                  <span
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: current }}
                  />
                  {current}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAccent(null);
                    setMode("system");
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Reset to default
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
