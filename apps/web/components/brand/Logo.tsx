import clsx from "clsx";

/**
 * The Planora mark: three segments of a day cycle.
 *
 * Kept from the previous identity deliberately. It is already the favicon, the
 * iOS and Android app icons for `com.planora.app` — which this task may not
 * modify — and the showcase film. Replacing it would fracture the brand across
 * surfaces outside this codebase. It is also the right mark: a day, segmented
 * and deliberately incomplete.
 *
 * Drawn inline rather than fetched so it inherits colour, needs no network
 * round trip, and stays crisp at any size. Geometry matches the 64-unit grid
 * used by the favicon and the native icons.
 */
export function LogoMark({ className, tile = true }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" className={className}>
      {tile && <rect width="64" height="64" rx="14.5" fill="var(--accent)" />}
      <g strokeWidth="7" strokeLinecap="round" fill="none" stroke={tile ? "#ffffff" : "var(--accent)"}>
        <path d="M25.16 50.79A20 20 0 0 1 12.49 27.58" />
        <path d="M19.14 16.68A20 20 0 0 1 45.58 17.32" />
        <path d="M51.70 28.53A20 20 0 0 1 37.93 51.10" />
      </g>
    </svg>
  );
}

const markSize = {
  sm: "size-9",
  md: "size-11",
  lg: "size-16"
} as const;

const wordSize = {
  sm: "text-[1.1875rem]",
  md: "text-[1.375rem]",
  lg: "text-[1.875rem]"
} as const;

/**
 * The wordmark is live text in the app's own typeface, so it renders as the
 * platform UI font and sits correctly against surrounding text instead of
 * being a baked image at a fixed weight.
 */
export function Logo({
  variant = "lockup",
  size = "md",
  tagline,
  className
}: {
  variant?: "lockup" | "mark";
  size?: "sm" | "md" | "lg";
  tagline?: string;
  className?: string;
}) {
  return (
    <span className={clsx("flex min-w-0 items-center gap-3", className)}>
      <LogoMark className={clsx("shrink-0 rounded-[22%]", markSize[size])} />
      {variant === "lockup" && (
        <span className="min-w-0">
          <span className={clsx("block truncate font-extrabold tracking-[-0.025em]", wordSize[size])}>Planora</span>
          {tagline && <span className="block truncate text-footnote text-muted">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
