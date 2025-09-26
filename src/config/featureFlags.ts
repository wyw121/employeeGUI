// Centralized feature flags for UI toggles
// Prefer environment variables (Vite) with safe defaults.

function readBoolEnv(key: string, defaultValue: boolean): boolean {
  // Vite exposes string envs under import.meta.env
  // Accept: '1', 'true', 'yes' (case-insensitive) as true
  try {
    const raw = (import.meta as any)?.env?.[key];
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'on';
    }
  } catch (_) {
    // noop in non-bundler contexts
  }
  return defaultValue;
}

export const featureFlags = {
  // Whether to show the legacy Smart VCF importer entry in the menu
  // Default: false (hide legacy to avoid ambiguity); enable with VITE_SHOW_LEGACY_VCF_IMPORT=1
  SHOW_LEGACY_VCF_IMPORT: readBoolEnv('VITE_SHOW_LEGACY_VCF_IMPORT', false),

  // Future toggles can be added here, e.g. experimental views
};

export type FeatureFlags = typeof featureFlags;
