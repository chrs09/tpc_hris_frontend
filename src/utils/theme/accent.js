// Turns one accent colour into the --primary / --primary-hover /
// --primary-foreground values for light or dark mode, so any colour a
// person picks stays readable: dark mode gets a lighter shade, and the
// text on it is white or near-black, whichever reads better.

export const DEFAULT_ACCENT = "#047857";

// Curated accents that look good in both modes.
export const ACCENT_PRESETS = [
  { name: "Emerald", hex: "#047857" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Blue", hex: "#1d4ed8" },
  { name: "Indigo", hex: "#4338ca" },
  { name: "Violet", hex: "#6d28d9" },
  { name: "Rose", hex: "#be123c" },
  { name: "Orange", hex: "#c2410c" },
  { name: "Amber", hex: "#b45309" },
  { name: "Slate", hex: "#334155" },
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (r, g, b) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
};

const hslToHex = (h, s, l) => {
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return rgbToHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex(hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255);
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// White or near-black text, whichever reads better on the colour.
const readableOn = (hex) =>
  contrast(hex, "#ffffff") >= contrast(hex, "#0f1110") ? "#ffffff" : "#0f1110";

export const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value || "");

export function accentVars(hex, isDark) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  if (isDark) {
    // Lighter, softer shade for dark backgrounds.
    const primary = hslToHex(h, Math.min(s, 0.7), Math.max(l, 0.55));
    return {
      "--primary": primary,
      "--primary-hover": hslToHex(h, Math.min(s, 0.7), Math.min(Math.max(l, 0.55) + 0.1, 0.85)),
      "--primary-foreground": readableOn(primary),
    };
  }
  return {
    "--primary": hex,
    "--primary-hover": hslToHex(h, s, Math.max(l - 0.08, 0.05)),
    "--primary-foreground": readableOn(hex),
  };
}
