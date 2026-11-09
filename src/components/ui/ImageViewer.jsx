import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

const MIN = 1;
const MAX = 5;
const STEP = 0.5;

// Full-screen image modal with zoom in / out (buttons, mouse wheel, double
// click) and drag to pan once zoomed. Esc or the backdrop closes it.
// `actions`: extra buttons (e.g. Rotate) shown in the toolbar.
export default function ImageViewer({ src, alt = "", title, onClose, actions = null }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);

  const zoom = (delta) =>
    setScale((s) => {
      const next = Math.min(MAX, Math.max(MIN, s + delta));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoom(STEP);
      if (e.key === "-") zoom(-STEP);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onPointerDown = (e) => {
    if (scale === 1) return;
    e.preventDefault();
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40";

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex flex-col bg-black/85"
      role="dialog"
      aria-modal="true"
      aria-label={title || alt || "Image"}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="truncate text-sm font-medium text-white">{title || alt}</p>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => zoom(-STEP)} disabled={scale <= MIN} aria-label="Zoom out" title="Zoom out">
            <Minus size={18} />
          </button>
          <span className="w-12 text-center text-xs text-white/80">{Math.round(scale * 100)}%</span>
          <button type="button" className={btn} onClick={() => zoom(STEP)} disabled={scale >= MAX} aria-label="Zoom in" title="Zoom in">
            <Plus size={18} />
          </button>
          <button type="button" className={btn} onClick={reset} disabled={scale === 1} aria-label="Reset zoom" title="Reset">
            <RotateCcw size={16} />
          </button>
          {actions}
          <button type="button" className={btn} onClick={onClose} aria-label="Close" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onWheel={(e) => zoom(e.deltaY < 0 ? STEP / 2 : -STEP / 2)}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={() => (scale === 1 ? setScale(2) : reset())}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.15s ease-out",
            cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
            touchAction: "none",
          }}
          className="max-h-full max-w-full select-none rounded-lg object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}
