"use client";

import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import type { Recommendation } from "../../lib/types";

/**
 * A recommendation, with the two feedback actions the ranker learns from.
 *
 * "Acted" and "Not now" rather than thumbs: the API records ACCEPTED and
 * DISMISSED and applies a cooldown, so the labels should describe what the
 * user did about the suggestion, not how they felt about it.
 */
export function RecommendationCard({
  recommendation,
  onAccept,
  onDismiss,
  busy
}: {
  recommendation: Recommendation;
  onAccept: () => void;
  onDismiss: () => void;
  busy?: boolean;
}) {
  return (
    <article className="enter-row px-5 py-4">
      <h3 className="text-body font-semibold">{recommendation.title}</h3>
      <p className="mt-1.5 max-w-prose text-callout leading-relaxed text-muted">{recommendation.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {recommendation.actionUrl && recommendation.actionLabel && (
          <Link
            href={toAppHref(recommendation.actionUrl)}
            className="focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-md bg-accent-strong px-4 text-footnote font-semibold text-white transition hover:bg-accent-hover active:scale-[0.97]"
          >
            {recommendation.actionLabel}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        )}
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-md px-4 text-footnote font-semibold text-muted transition hover:bg-sunken hover:text-ink disabled:opacity-50"
        >
          <Check className="size-3.5" aria-hidden="true" />
          Acted on it
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-md px-4 text-footnote font-semibold text-muted transition hover:bg-sunken hover:text-ink disabled:opacity-50"
        >
          <X className="size-3.5" aria-hidden="true" />
          Not now
        </button>
      </div>
    </article>
  );
}

/**
 * The API stores action URLs from when the app lived at the site root
 * ("/tasks", "/wellbeing", "/"). The app now lives under /app, so these are
 * rewritten on the way out rather than asking the backend to change.
 */
function toAppHref(actionUrl: string): string {
  if (actionUrl === "/") return "/app";
  if (actionUrl.startsWith("/app")) return actionUrl;
  return `/app${actionUrl}`;
}
