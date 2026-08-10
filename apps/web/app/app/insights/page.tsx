"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  Brain,
  CalendarDays,
  ChevronDown,
  Clock,
  FileText,
  GitCompare,
  ListChecks,
  PauseCircle,
  Sparkles,
  Timer,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { RecommendationCard } from "../../../components/app/RecommendationCard";
import { Group, Section } from "../../../components/ui/surfaces";
import { EvidenceBlock } from "../../../components/ui/evidence";
import { Banner, Confidence, EmptyState, InfoRow, Metric, SkeletonPage } from "../../../components/ui/feedback";
import { apiRequest } from "../../../lib/api";
import { formatMinutes, label as toLabel, percent } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useResource } from "../../../lib/useResource";
import type { DashboardData, NeuralEngineStatus, PatternKind, PatternReport, Recommendation } from "../../../lib/types";

const patternIcon: Record<PatternKind, LucideIcon> = {
  weekday_rhythm: CalendarDays,
  time_of_day: Clock,
  co_occurrence: GitCompare,
  trend: TrendingUp,
  lapse: PauseCircle
};

const kindLabel: Record<PatternKind, string> = {
  weekday_rhythm: "Weekday rhythm",
  time_of_day: "Time of day",
  co_occurrence: "Co-occurrence",
  trend: "Trend",
  lapse: "Lapse"
};

export default function InsightsPage() {
  const { guard } = useMessages();
  const dashboard = useResource<DashboardData>("/dashboard");
  const recommendations = useResource<{ recommendations: Recommendation[] }>("/recommendations");
  const neural = useResource<{ status: NeuralEngineStatus }>("/neural/status");
  const patterns = useResource<{ report: PatternReport }>("/neural/patterns");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  if (dashboard.status === "loading" && patterns.status === "loading") return <SkeletonPage metrics={3} rows={5} />;

  const report = patterns.data?.report ?? null;
  const engine = neural.data?.status ?? null;
  const recs = recommendations.data?.recommendations ?? [];
  const disabled = engine?.learningMode === "disabled";

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function feedback(id: string, action: "ACCEPTED" | "DISMISSED") {
    setBusy(id);
    await guard(async () => {
      await apiRequest(`/recommendations/${id}/feedback`, { method: "POST", body: { action } });
      await Promise.all([recommendations.reload(), neural.reload(), dashboard.reload()]);
    });
    setBusy(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Patterns"
        title="Insights"
        description="What Planora noticed in your own logs, and the arithmetic behind each observation."
        action={
          <Link
            href="/app/reports"
            className="focus-ring inline-flex min-h-touch items-center gap-2 rounded-md border border-line bg-surface px-4 text-callout font-semibold"
          >
            <FileText className="size-4" aria-hidden="true" />
            Weekly review
          </Link>
        }
      />

      {disabled && (
        <Banner tone="info">
          <strong className="font-semibold">Personalization is off.</strong> The learning engine is paused and no
          patterns are computed. Turn it back on in Settings if you want these again.
        </Banner>
      )}

      <div className="mt-6 space-y-10">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric icon={ListChecks} label="Finished" value={dashboard.data?.weeklyStatistics.completedTasks ?? 0} detail="this week" />
          <Metric icon={Activity} label="Active" value={formatMinutes(dashboard.data?.weeklyStatistics.activeMinutes ?? 0)} detail="this week" />
          <Metric icon={Brain} label="Confidence" value={percent(engine?.confidence ?? 0)} detail="in its own ranking" />
          <Metric
            icon={Sparkles}
            label="Active days"
            value={engine?.engagement.activeDays30 ?? 0}
            detail="of the last 30"
          />
        </div>

        <Section
          title="Patterns"
          action={
            report && (
              <span className="tabular text-footnote text-muted">
                {report.observedDays} active days in {report.windowDays}
              </span>
            )
          }
        >
          {patterns.status === "error" ? (
            <Banner tone="error">{patterns.error ?? "Patterns could not be loaded."}</Banner>
          ) : !report || report.patterns.length === 0 ? (
            <Group>
              <EmptyState
                icon={GitCompare}
                title={disabled ? "Paused" : "Not enough history yet"}
                body={
                  disabled
                    ? "Patterns are only computed while personalization is on."
                    : "Patterns appear once there are a few weeks of logs to compare. Keep logging ordinary days."
                }
              />
            </Group>
          ) : (
            <Group className="stagger">
              {report.patterns.map((pattern) => {
                const Icon = patternIcon[pattern.kind] ?? Brain;
                const open = expanded.has(pattern.key);
                return (
                  <article key={pattern.key} className="enter-row px-5 py-4">
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent-wash">
                        <Icon className="size-[1.125rem] text-accent-text" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-micro font-bold uppercase text-muted">{kindLabel[pattern.kind]}</p>
                        <h3 className="mt-1 break-words text-callout font-semibold">{pattern.title}</h3>
                        <p className="mt-1.5 break-words text-footnote leading-relaxed text-muted">{pattern.detail}</p>
                      </div>
                      <div className="shrink-0">
                        <Confidence value={pattern.confidence} />
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(pattern.key)}
                      className="focus-ring mt-3 flex min-h-touch items-center gap-1.5 rounded-md text-footnote font-semibold text-accent-text"
                    >
                      {open ? "Hide the working" : "Show the working"}
                      <ChevronDown className={clsx("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
                    </button>

                    {open && <EvidenceBlock evidence={pattern.evidence} className="enter-row mt-2" />}
                  </article>
                );
              })}
            </Group>
          )}

          {report && report.patterns.length > 0 && (
            <p className="mt-3 max-w-prose px-1 text-footnote leading-relaxed text-muted">
              These are associations in your own logs, computed locally. An association is not a cause — two things
              moving together over a few weeks of self-reported data is worth noticing, not proof of a mechanism.
            </p>
          )}
        </Section>

        {report && report.inconclusive.length > 0 && (
          <Section title="Checks that found nothing" >
            <Group>
              <div className="divide-hairline">
                {report.inconclusive.map((item) => (
                  <div key={item.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3">
                    <span className="font-evidence text-micro text-evidence-key">{item.key}</span>
                    <span className="min-w-0 flex-1 text-footnote text-muted">{item.reason}</span>
                  </div>
                ))}
              </div>
            </Group>
            <p className="mt-3 max-w-prose px-1 text-footnote text-muted">
              Listed so an empty result is explainable rather than looking like the check never ran.
            </p>
          </Section>
        )}

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <Section title="Suggestions">
            <Group>
              {recs.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title={disabled ? "Paused" : "Nothing active"}
                  body={
                    disabled
                      ? "Suggestions resume when personalization is switched back on."
                      : "Suggestions are generated from your records as they change."
                  }
                />
              ) : (
                <div className="divide-hairline stagger">
                  {recs.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                      busy={busy === recommendation.id}
                      onAccept={() => void feedback(recommendation.id, "ACCEPTED")}
                      onDismiss={() => void feedback(recommendation.id, "DISMISSED")}
                    />
                  ))}
                </div>
              )}
            </Group>
          </Section>

          <div className="space-y-8">
            <Section title="Learning engine">
              <Group>
                {!engine ? (
                  <EmptyState icon={Brain} title="Status unavailable" body="The engine did not return a status." />
                ) : (
                  <>
                    <InfoRow icon={Brain} label="Engine" value={toLabel(engine.engine)} />
                    <InfoRow icon={Sparkles} label="Confidence" value={percent(engine.confidence)} />
                    <InfoRow
                      icon={Timer}
                      label="Most active window"
                      value={
                        engine.focusWindow
                          ? `${engine.focusWindow.label} (${engine.focusWindow.sessions} logged)`
                          : "Still learning"
                      }
                    />
                    <InfoRow
                      icon={Activity}
                      label="Samples"
                      value={`${engine.samples.events} events · ${engine.samples.recommendationFeedback} feedback`}
                    />
                    <InfoRow icon={CalendarDays} label="App streak" value={`${engine.engagement.currentAppStreak} days`} />
                    <InfoRow icon={ListChecks} label="Readiness" value={toLabel(engine.engagement.readiness)} />
                  </>
                )}
              </Group>
              <p className="mt-3 max-w-prose px-1 text-footnote leading-relaxed text-muted">
                Readiness is a changing product signal describing how much data the ranker has to work with. It is not a
                judgement of you.
              </p>
            </Section>

            {engine && engine.detectedHabits.length > 0 && (
              <Section title="Routines it inferred">
                <Group>
                  <div className="divide-hairline">
                    {engine.detectedHabits.map((habit) => (
                      <div key={habit.key} className="flex items-center justify-between gap-4 px-5 py-3">
                        <span className="min-w-0 truncate text-callout">{habit.title}</span>
                        <span className="tabular shrink-0 font-evidence text-footnote text-muted">
                          {habit.streak}d streak · {percent(habit.confidence)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Group>
              </Section>
            )}

            {engine && engine.topSignals.length > 0 && (
              <Section title="What is shaping your ranking">
                <Group>
                  <div className="divide-hairline">
                    {engine.topSignals.map((signal) => (
                      <p key={signal} className="px-5 py-3 text-footnote leading-relaxed text-muted">
                        {signal}
                      </p>
                    ))}
                  </div>
                </Group>
              </Section>
            )}

            {engine && engine.nextImprovements.length > 0 && (
              <Section title="What would sharpen it">
                <Group>
                  <div className="divide-hairline">
                    {engine.nextImprovements.map((item) => (
                      <p key={item} className="px-5 py-3 text-footnote leading-relaxed text-muted">
                        {item}
                      </p>
                    ))}
                  </div>
                </Group>
              </Section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
