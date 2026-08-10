"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemePreference } from "./types";

/**
 * Theme lives above the session because the public site has no session and
 * still has to respect the visitor's system preference.
 *
 * Flash prevention is handled by `themeBootScript` in the root layout, which
 * runs before first paint. This provider only takes over afterwards.
 */

export const THEME_STORAGE_KEY = "planora_theme";

type Resolved = "LIGHT" | "DARK";

type ThemeValue = {
  preference: ThemePreference;
  resolved: Resolved;
  /** `persistLocally: false` is used when syncing down from account settings. */
  setPreference: (next: ThemePreference, options?: { persistLocally?: boolean }) => void;
  toggle: () => Resolved;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Runs before paint. Kept in sync with `resolvePreference` below — if the two
 * disagree the page flashes, which is the one thing this must never do.
 */
export const themeBootScript = `(function(){try{
var saved=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var dark=saved==="DARK"||(saved!=="LIGHT"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",dark);
}catch(e){}})();`;

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolvePreference(preference: ThemePreference): Resolved {
  if (preference === "DARK") return "DARK";
  if (preference === "LIGHT") return "LIGHT";
  return systemPrefersDark() ? "DARK" : "LIGHT";
}

function applyResolved(resolved: Resolved) {
  document.documentElement.classList.toggle("dark", resolved === "DARK");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start from SYSTEM on both server and first client render so hydration
  // matches; the effect below immediately reconciles with storage.
  const [preference, setPreferenceState] = useState<ThemePreference>("SYSTEM");
  const [resolved, setResolved] = useState<Resolved>("LIGHT");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const initial: ThemePreference = stored === "DARK" || stored === "LIGHT" ? stored : "SYSTEM";
    setPreferenceState(initial);
    const next = resolvePreference(initial);
    setResolved(next);
    applyResolved(next);
  }, []);

  // Only follow the OS while the preference is actually SYSTEM.
  useEffect(() => {
    if (preference !== "SYSTEM") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next: Resolved = media.matches ? "DARK" : "LIGHT";
      setResolved(next);
      applyResolved(next);
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference, options?: { persistLocally?: boolean }) => {
    setPreferenceState(next);
    const nextResolved = resolvePreference(next);
    setResolved(nextResolved);

    // Crossfade only for the duration of the switch, so ordinary interactions
    // are never animated.
    const root = document.documentElement;
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 220);

    applyResolved(nextResolved);

    if (options?.persistLocally === false) return;
    try {
      if (next === "SYSTEM") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // A private-mode browser refusing storage is not worth interrupting for.
    }
  }, []);

  const toggle = useCallback((): Resolved => {
    const next: Resolved = resolvePreference(preference) === "DARK" ? "LIGHT" : "DARK";
    setPreference(next);
    return next;
  }, [preference, setPreference]);

  const value = useMemo<ThemeValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
