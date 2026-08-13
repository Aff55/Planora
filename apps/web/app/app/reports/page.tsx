"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Panel, Section } from "../../../components/ui/surfaces";
import { Button } from "../../../components/ui/controls";
import { EvidenceBlock } from "../../../components/ui/evidence";
import { Banner, EmptyState, SkeletonPage } from "../../../components/ui/feedback";
import { formatLongDate, formatMinutes, percent } from "../../../lib/format";
import { useResource } from "../../../lib/useResource";
import type { DashboardData, AdaptiveRankerStatus, PatternReport, WellbeingSummary } from "../../../lib/types";

/**
 * The weekly review.
 *
 * Every figure is read from an endpoint; none is estimated, projected or
 * filled in. Where the system holds nothing, the row says so rather than
 * printing a zero that reads like a measurement.
 *
 * Export is the browser's own print-to-PDF. That avoids shipping a PDF library
 * for one screen, and — more to the point — keeps the document generation on
 * this machine, which a server-rendered PDF would not.
 */
export default function ReportsPage() {
  const dashboard = useResource<DashboardData>("/dashboard");
  const wellbeing = useResource<WellbeingSummary>("/wellbeing/summary");
  const patterns = useResource<{ report: PatternReport }>("/ranker/patterns");
  const ranker = useResource<{ status: AdaptiveRankerStatus }>("/ranker/status");

  if (dashboard.status === "loading") return <SkeletonPage metrics={4} rows={4} />;
  if (dashboard.status === "error" || !dashboard.data) {
    return (
      <>
        <PageHeader title="Weekly review" />
        <Banner tone="error">{dashboard.error ?? "Could not build the report."}</Banner>
      </>
    );
  }

  const data = dashboard.data;
  const report = patterns.data?.report ?? null;
  const engine = ranker.data?.status ?? null;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Tasks finished", value: String(data.weeklyStatistics.completedTasks) },
    { label: "Tasks still open", value: String(data.weeklyStatistics.activeTasks) },
    { label: "Active minutes logged", value: formatMinutes(data.weeklyStatistics.activeMinutes) },
    { label: "Movement", value: formatMinutes(data.lifeSummary.fitnessMinutes) },
    { label: "Social touchpoints", value: String(data.lifeSummary.socialCount) },
    { label: "Meals logged", value: String(data.lifeSummary.foodCount) },
    {
      label: "Average mood",
      value: data.moodSummary.averageMood === null ? "Not logged" : `${data.moodSummary.averageMood}/5`
    },
    {
      label: "Average sleep",
      value: data.sleepSummary.averageHours === null ? "Not logged" : `${data.sleepSummary.averageHours}h`
    },
    { label: "Water today", value: `${data.waterIntake.todayMl}ml of ${data.waterIntake.targetMl}ml` },
    { label: "Mood check-ins", value: String(wellbeing.data?.moodLogs.length ?? 0) },
    { label: "Sleep logs", value: String(wellbeing.data?.sleepLogs.length ?? 0) }
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/insights" className="focus-ring inline-flex min-h-touch items-center gap-2 rounded-md text-footnote font-semibold text-muted">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to insights
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Save as PDF
        </Button>
      </div>

      <PageHeader
        eyebrow={formatLongDate(new Date())}
        title="Weekly review"
        description="Built from the records Planora actually holds. Nothing here is estimated."
      />

      <div className="space-y-8">
        <Section title="The week in figures">
          <Group>
            <div className="divide-hairline print-break">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-callout text-muted">{row.label}</span>
                  <span className="tabular shrink-0 text-callout font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </Group>
        </Section>

        {engine && (
          <Section title="What the ranker is working from">
            <Panel className="print-break">
              <p className="text-callout leading-relaxed text-muted">
                Confidence {percent(engine.confidence)}, built on {engine.samples.events} recorded events and{" "}
                {engine.samples.recommendationFeedback} feedback action
                {engine.samples.recommendationFeedback === 1 ? "" : "s"} across {engine.engagement.activeDays30} active
                days in the last 30.
                {engine.focusWindow
                  ? ` Your most active window is the ${engine.focusWindow.label}.`
                  : " There is not yet enough data to identify an active window."}
              </p>
            </Panel>
          </Section>
        )}

        <Section title="Patterns">
          {!report || report.patterns.length === 0 ? (
            <Group>
              <EmptyState
                title="No patterns this period"
                body="The detectors ran and found nothing strong enough to report. That is a result, not a gap."
              />
            </Group>
          ) : (
            <div className="space-y-4">
              {report.patterns.map((pattern) => (
                <div key={pattern.key} className="print-break rounded-lg border border-line bg-surface p-5">
                  <h3 className="break-words text-callout font-semibold">{pattern.title}</h3>
                  <p className="mt-1.5 text-footnote leading-relaxed text-muted">{pattern.detail}</p>
                  <EvidenceBlock evidence={pattern.evidence} className="mt-4" />
                </div>
              ))}
              <p className="max-w-prose px-1 text-footnote leading-relaxed text-muted">
                Associations found in your own logs. An association is not a cause.
              </p>
            </div>
          )}
        </Section>

        {report && report.inconclusive.length > 0 && (
          <Section title="Checked, nothing found">
            <Group>
              <div className="divide-hairline print-break">
                {report.inconclusive.map((item) => (
                  <div key={item.key} className="px-5 py-3">
                    <p className="font-evidence text-micro text-evidence-key">{item.key}</p>
                    <p className="mt-1 text-footnote text-muted">{item.reason}</p>
                  </div>
                ))}
              </div>
            </Group>
          </Section>
        )}
      </div>
    </div>
  );
}
