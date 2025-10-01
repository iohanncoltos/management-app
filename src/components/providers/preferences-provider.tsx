"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ThemeOption = "SYSTEM" | "LIGHT" | "DARK";
export type LayoutDensityOption = "COMFORTABLE" | "COMPACT";

interface PreferencesContextValue {
  theme: ThemeOption;
  density: LayoutDensityOption;
  setTheme: (theme: ThemeOption) => void;
  setDensity: (density: LayoutDensityOption) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function resolveSystemTheme() {
  if (typeof window === "undefined") {
    return "DARK";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "DARK" : "LIGHT";
}

function applyTheme(theme: ThemeOption) {
  if (typeof window === "undefined") return;
  const effective = theme === "SYSTEM" ? resolveSystemTheme() : theme;
  document.documentElement.dataset.theme = effective.toLowerCase();
  document.body.dataset.theme = effective.toLowerCase();
}

function applyDensity(density: LayoutDensityOption) {
  if (typeof window === "undefined") return;
  document.documentElement.dataset.density = density.toLowerCase();
  document.body.dataset.density = density.toLowerCase();
}

interface PreferencesProviderProps {
  children: React.ReactNode;
  initialTheme: ThemeOption;
  initialDensity: LayoutDensityOption;
}

export function PreferencesProvider({ children, initialTheme, initialDensity }: PreferencesProviderProps) {
  const [theme, setThemeState] = useState<ThemeOption>(initialTheme);
  const [density, setDensityState] = useState<LayoutDensityOption>(initialDensity);
  const systemListener = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    applyTheme(theme);

    if (theme === "SYSTEM") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("SYSTEM");
      media.addEventListener("change", handler);
      systemListener.current = media;
      return () => media.removeEventListener("change", handler);
    }

    systemListener.current = null;
    return undefined;
  }, [theme]);

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  useEffect(() => {
    // Ensure DOM matches server-rendered values on mount
    applyTheme(initialTheme);
    applyDensity(initialDensity);
  }, [initialTheme, initialDensity]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      density,
      setTheme: setThemeState,
      setDensity: setDensityState,
    }),
    [theme, density],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
