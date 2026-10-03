import { useCallback, useEffect, useState } from "react";
import ThemeContext from "./theme-context";
import { getMyTheme, saveMyTheme } from "../api/preferences";
import { accentVars, isHexColor } from "../utils/theme/accent";
import { isImpersonating } from "../utils/impersonation";

// Theme = mode (light / dark / follow the device) + an optional accent
// colour. Each person's choice is saved on their account (so it follows
// them on every device) and kept in localStorage so it applies instantly
// on load, before the saved one arrives.
const PRIMARY_VARS = ["--primary", "--primary-hover", "--primary-foreground"];

const readLocal = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocal = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage blocked -- the theme still applies for this visit
  }
};

const initialMode = () => {
  const mode = readLocal("theme_mode");
  if (["light", "dark", "system"].includes(mode)) return mode;
  const legacy = readLocal("theme");
  return legacy === "light" || legacy === "dark" ? legacy : "system";
};

const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const isLoggedIn = () => Boolean(readLocal("access_token"));

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(initialMode);
  const [accent, setAccentState] = useState(() => {
    const stored = readLocal("theme_accent");
    return isHexColor(stored) ? stored : null;
  });
  const [systemDark, setSystemDark] = useState(prefersDark);

  const theme = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  // Follow the device when mode is "system".
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Apply: dark class + the accent colours for the current mode.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    if (accent) {
      Object.entries(accentVars(accent, theme === "dark")).forEach(([name, value]) =>
        root.style.setProperty(name, value),
      );
    } else {
      PRIMARY_VARS.forEach((name) => root.style.removeProperty(name));
    }
    writeLocal("theme_mode", mode);
    writeLocal("theme", theme);
    writeLocal("theme_accent", accent);
  }, [theme, mode, accent]);

  // Load the person's saved theme (on start, and after logging in).
  // Skipped while viewing as someone else.
  const loadSaved = useCallback(() => {
    if (!isLoggedIn() || isImpersonating()) return;
    getMyTheme()
      .then((saved) => {
        if (["light", "dark", "system"].includes(saved?.mode)) setModeState(saved.mode);
        if (saved && "accent" in saved) {
          setAccentState(isHexColor(saved.accent) ? saved.accent : null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSaved();
    window.addEventListener("theme-sync", loadSaved);
    return () => window.removeEventListener("theme-sync", loadSaved);
  }, [loadSaved]);

  const persist = (next) => {
    if (!isLoggedIn() || isImpersonating()) return;
    saveMyTheme(next).catch(() => {});
  };

  const setMode = (next) => {
    setModeState(next);
    persist({ mode: next, accent });
  };

  const setAccent = (next) => {
    const value = isHexColor(next) ? next.toLowerCase() : null;
    setAccentState(value);
    persist({ mode, accent: value });
  };

  const setTheme = (next) => setMode(next);
  const toggleTheme = () => setMode(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider
      value={{ theme, mode, accent, setTheme, setMode, setAccent, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
