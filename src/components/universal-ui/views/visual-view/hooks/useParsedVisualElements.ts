// Canonical re-export wrapper to ensure single source of truth for the parser hook
// Keep this file extension as .ts (no JSX) and delegate to the canonical .tsx implementation.
export type { UseParsedVisualElementsResult } from "./canonical/useParsedVisualElementsCanonical";
export { useParsedVisualElements } from "./canonical/useParsedVisualElementsCanonical";
