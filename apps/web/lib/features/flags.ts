/**
 * The single flag governing every not-yet-connected feature.
 *
 * A feature behind this flag is wired to a mock adapter and must render the
 * preview affordance. Turning the flag off hides the surface entirely; turning
 * it on shows it clearly marked as unconnected. There is no third state where
 * mock data is presented as real.
 *
 * Default on in development so the work is reviewable, off in production
 * builds unless explicitly enabled.
 */
export const PREVIEW_FEATURES: boolean =
  process.env.NEXT_PUBLIC_PLANORA_PREVIEW === "1" ||
  (process.env.NEXT_PUBLIC_PLANORA_PREVIEW !== "0" && process.env.NODE_ENV !== "production");

/** Shown wherever preview data appears. Deliberately not dismissible. */
export const PREVIEW_NOTICE = "Preview — not yet connected";
