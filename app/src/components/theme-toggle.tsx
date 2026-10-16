"use client";

import { useSyncExternalStore } from "react";

const storageKey = "yerbacapital-theme";
const changeEvent = "yerbacapital-theme-change";
type ThemePreference = "light" | "dark" | "system";

function currentPreference(): ThemePreference {
  const value = document.documentElement.dataset.themePreference;
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = preference === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
}

function subscribe(onChange: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const update = () => { applyTheme(currentPreference()); onChange(); };
  const storage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    applyTheme(event.newValue === "light" || event.newValue === "dark" ? event.newValue : "system");
    onChange();
  };
  media.addEventListener("change", update);
  window.addEventListener("storage", storage);
  window.addEventListener(changeEvent, update);
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener("storage", storage);
    window.removeEventListener(changeEvent, update);
  };
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, currentPreference, () => "system" as const);
  return <div className="theme-toolbar">
    <label htmlFor="theme-preference">Apariencia</label>
    <select id="theme-preference" value={preference} onChange={event => {
      const value = event.target.value as ThemePreference;
      applyTheme(value);
      try { localStorage.setItem(storageKey, value); } catch { /* Still works for this visit when storage is unavailable. */ }
      window.dispatchEvent(new Event(changeEvent));
    }}>
      <option value="system">Según mi dispositivo</option>
      <option value="light">Modo claro</option>
      <option value="dark">Modo oscuro</option>
    </select>
  </div>;
}
