"use client";

import clsx from "clsx";
import { AlertCircle, CircleDashed, Info, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { surface } from "./surfaces";

/**
 * States: empty, loading, error, and the read-outs that carry real figures.
 *
 * Skeletons here are shaped like the content they stand in for. That is the
 * point — a skeleton whose geometry differs from the final layout causes a
 * reflow on arrival, which is slower to read than a spinner would have been.
 */

export function EmptyState({
  title,
  body,
  icon: Icon = CircleDashed,
  action
}: {
  title: string;
  body: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-accent-wash">
        <Icon className="size-5 text-accent-text" aria-hidden="true" />
      </span>
      <p className="text-body font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-prose text-callout text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden="true" />;
}

/** Matches the geometry of a hairline-separated list row. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className={clsx("divide-hairline overflow-hidden rounded-lg", surface)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[42%]" />
            <Skeleton className="h-3 w-[26%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Page-level placeholder: title block, metric row, then a list. */
export function SkeletonPage({ metrics = 4, rows = 4 }: { metrics?: number; rows?: number }) {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {metrics > 0 && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: metrics }, (_, index) => (
            <div key={index} className={clsx("rounded-lg p-5", surface)}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-24" />
            </div>
          ))}
        </div>
      )}
      <SkeletonRows rows={rows} />
    </div>
  );
}

export function Banner({
  tone,
  children,
  onDismiss
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = tone === "error" ? AlertCircle : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "enter-row flex items-start gap-3 rounded-lg border px-4 py-3 text-callout",
        tone === "error" && "border-critical/30 bg-critical-wash text-critical",
        tone === "success" && "border-positive/30 bg-positive-wash text-positive",
        tone === "info" && "border-line bg-sunken text-muted"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-medium">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="focus-ring -m-1 shrink-0 rounded p-1 opacity-70 transition hover:opacity-100"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

/**
 * Counts up on first paint only. A refetch snaps to the new value, so this
 * reads as the figure arriving rather than a looping effect. Reduced motion
 * and zero skip it entirely.
 */
export function CountUp({ value, duration = 620 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) {
      setDisplay(value);
      return;
    }
    animated.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !Number.isFinite(value) || value === 0) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export function Metric({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className={clsx("rounded-lg p-5", surface)}>
      <div className="flex items-center gap-2.5 text-muted">
        <Icon className="size-[1.125rem] shrink-0 text-accent-text" aria-hidden="true" />
        <span className="truncate text-footnote font-semibold">{label}</span>
      </div>
      <p className="tabular mt-2.5 text-title-1">{value}</p>
      {detail && <p className="mt-1 text-footnote text-muted">{detail}</p>}
    </div>
  );
}

export function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="flex min-w-0 items-center gap-3.5 text-callout text-muted">
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular shrink-0 text-callout font-semibold text-ink">{value}</span>
    </div>
  );
}

/**
 * A confidence read-out. Deliberately paired with its number: a bare bar
 * invites reading a shape as a claim, which is the opposite of what the
 * pattern engine is careful to avoid.
 */
export function Confidence({ value, label = "Confidence" }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <span className="flex items-center gap-2" title={`${label}: ${pct}%`}>
      <span
        className="h-1.5 w-12 overflow-hidden rounded-full bg-sunken"
        role="img"
        aria-label={`${label} ${pct} percent`}
      >
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular font-evidence text-footnote text-muted">{pct}%</span>
    </span>
  );
}

/** Links in model output. Opened safely; never auto-followed. */
export function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent-text underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}
