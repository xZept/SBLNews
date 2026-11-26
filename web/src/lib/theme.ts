import type { ThemePreferenceType } from "@/lib/queries/projections";

export const THEME_STORAGE_KEY = "sbl_theme";

/**
 * Synchronize the active theme to the DOM (`data-theme` and `<meta name="color-scheme">`)
 * and persist to `localStorage` for zero-FOIT pre-paint initialization across reloads.
 */
export function applyThemeToDocument(
  theme: ThemePreferenceType,
  persistToStorage = true
): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = theme;
  }

  if (persistToStorage && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota or private-mode access errors.
    }
  }
}

/**
 * Clear the browser's stored theme preference and immediately revert the active
 * DOM theme to Light Mode (used on sign-out without mutating `profiles.theme_preference`).
 */
export function clearStoredThemeAndResetToLight(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Ignore storage access errors.
    }
  }

  applyThemeToDocument("light", false);
}
