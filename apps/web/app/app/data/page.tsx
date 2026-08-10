"use client";

import { useState } from "react";
import { Database, Download } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Section } from "../../../components/ui/surfaces";
import { Button, Segmented } from "../../../components/ui/controls";
import { Banner, EmptyState, SkeletonRows } from "../../../components/ui/feedback";
import { apiDownload } from "../../../lib/api";
import { formatDateTime, formatMinutes, label as toLabel } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useResource } from "../../../lib/useResource";
import type {
  ActivityEntry,
  CalendarEvent,
  DashboardData,
  PageInfo,
  Task,
  WellbeingSummary
} from "../../../lib/types";

/**
 * The data explorer.
 *
 * Shows what Planora holds and, for each kind of record, which adaptive
 * feature actually reads it. That second column is the point: "we adapt
 * without profiling you" is only checkable if you can see what feeds what.
 *
 * Every consumer listed below is traceable to a service in `apps/api/src`, not
 * a guess about what the app probably does.
 */

type Kind = "TASKS" | "EVENTS" | "LIFE" | "WELLBEING";

const kinds = [
  { value: "TASKS" as const, label: "Tasks" },
  { value: "EVENTS" as const, label: "Calendar" },
  { value: "LIFE" as const, label: "Life logs" },
  { value: "WELLBEING" as const, label: "Wellbeing" }
];

const consumers: Record<Kind, string[]> = {
  TASKS: [
    "Dashboard — due today, upcoming, and the day score",
    "Suggestions — overdue review, protecting the next deadline, unscheduled high-priority work",
    "Pattern engine — completion dates feed the “finishing tasks” rhythm and lapse detectors",
    "Habit engine — task follow-through",
    "Companion — a compact list of overdue, today and upcoming, when personalization is on"
  ],
  EVENTS: [
    "Dashboard — the next two weeks",
    "Suggestions — calendar load and overlap pressure",
    "Companion — today and upcoming events, with overlaps flagged"
  ],
  LIFE: [
    "Pattern engine — every detector: weekday rhythm, time of day, lapses, and active-minute correlations",
    "Habit engine — movement, meal awareness, social connection, outdoor time",
    "Suggestions — food balance, workout rotation, social and outdoor prompts",
    "Ranker — your most active window"
  ],
  WELLBEING: [
    "Dashboard — mood and sleep averages, hydration against target",
    "Pattern engine — sleep against next-day mood and energy, stress trend, hydration against energy",
    "Suggestions — short sleep, elevated strain, low hydration",
    "Companion — averages always; individual reflections and notes only when private mode is off"
  ]
};

export default function DataPage() {
  const { guard } = useMessages();
  const [kind, setKind] = useState<Kind>("TASKS");

  const tasks = useResource<{ tasks: Task[]; pageInfo: PageInfo }>("/tasks?limit=100");
  const events = useResource<{ events: CalendarEvent[]; pageInfo: PageInfo }>("/calendar?limit=100");
  const activities = useResource<{ today: ActivityEntry[]; recent: ActivityEntry[] }>("/activities");
  const wellbeing = useResource<WellbeingSummary>("/wellbeing/summary");
  const dashboard = useResource<DashboardData>("/dashboard");

  async function exportAll() {
    await guard(async () => {
      const { blob, filename } = await apiDownload("/auth/export");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "Export downloaded.");
  }

  const counts = {
    TASKS: tasks.data?.tasks.length ?? 0,
    EVENTS: events.data?.events.length ?? 0,
    LIFE: activities.data?.recent.length ?? 0,
    WELLBEING:
      (wellbeing.data?.moodLogs.length ?? 0) +
      (wellbeing.data?.sleepLogs.length ?? 0) +
      (wellbeing.data?.journals.length ?? 0)
  };

  const loading =
    (kind === "TASKS" && tasks.status === "loading") ||
    (kind === "EVENTS" && events.status === "loading") ||
    (kind === "LIFE" && activities.status === "loading") ||
    (kind === "WELLBEING" && wellbeing.status === "loading");

  function renderRows() {
    if (kind === "TASKS") {
      const rows = tasks.data?.tasks ?? [];
      if (rows.length === 0) return <EmptyState icon={Database} title="No tasks" body="Nothing stored yet." />;
      return (
        <div className="divide-hairline">
          {rows.map((task) => (
            <div key={task.id} className="px-5 py-3">
              <p className="break-words text-callout font-medium">{task.title}</p>
              <p className="mt-1 font-evidence text-micro text-evidence-key">
                {task.status} · {task.priority} · {task.category} · created {formatDateTime(task.createdAt)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (kind === "EVENTS") {
      const rows = events.data?.events ?? [];
      if (rows.length === 0) return <EmptyState icon={Database} title="No events" body="Nothing stored yet." />;
      return (
        <div className="divide-hairline">
          {rows.map((event) => (
            <div key={event.id} className="px-5 py-3">
              <p className="break-words text-callout font-medium">{event.title}</p>
              <p className="mt-1 font-evidence text-micro text-evidence-key">
                {event.type} · {formatDateTime(event.startAt)} → {formatDateTime(event.endAt)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (kind === "LIFE") {
      const rows = activities.data?.recent ?? [];
      if (rows.length === 0) return <EmptyState icon={Database} title="No life logs" body="Nothing stored yet." />;
      return (
        <div className="divide-hairline">
          {rows.map((entry) => (
            <div key={entry.id} className="px-5 py-3">
              <p className="break-words text-callout font-medium">{entry.title}</p>
              <p className="mt-1 font-evidence text-micro text-evidence-key">
                {entry.category} · {formatMinutes(entry.minutes)} · {formatDateTime(entry.occurredAt)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    const mood = wellbeing.data?.moodLogs ?? [];
    const sleep = wellbeing.data?.sleepLogs ?? [];
    const journals = wellbeing.data?.journals ?? [];
    if (mood.length + sleep.length + journals.length === 0) {
      return <EmptyState icon={Database} title="No wellbeing records" body="Nothing stored yet." />;
    }
    return (
      <div className="divide-hairline">
        {mood.map((entry) => (
          <div key={entry.id} className="px-5 py-3">
            <p className="text-callout font-medium">Mood · {toLabel(entry.mood)}</p>
            <p className="mt-1 font-evidence text-micro text-evidence-key">
              stress {entry.stress} · energy {entry.energy} · {formatDateTime(entry.loggedAt)}
              {entry.reflection ? " · has reflection text" : ""}
            </p>
          </div>
        ))}
        {sleep.map((entry) => (
          <div key={entry.id} className="px-5 py-3">
            <p className="text-callout font-medium">Sleep · {entry.hours}h</p>
            <p className="mt-1 font-evidence text-micro text-evidence-key">
              {entry.quality} · {formatDateTime(entry.loggedAt)}
            </p>
          </div>
        ))}
        {journals.map((entry) => (
          <div key={entry.id} className="px-5 py-3">
            <p className="break-words text-callout font-medium">Journal · {entry.title}</p>
            <p className="mt-1 font-evidence text-micro text-evidence-key">
              {entry.body.length} characters · {formatDateTime(entry.createdAt)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Transparency"
        title="Your data"
        description="What Planora holds, and which adaptive feature reads each kind of record."
        action={
          <Button variant="secondary" onClick={() => void exportAll()}>
            <Download className="size-4" aria-hidden="true" />
            Export everything
          </Button>
        }
      />

      <div className="space-y-8">
        <Group>
          <div className="grid grid-cols-2 divide-hairline sm:grid-cols-4 sm:divide-x">
            {kinds.map((item) => (
              <div key={item.value} className="px-5 py-4">
                <p className="text-micro font-bold uppercase text-muted">{item.label}</p>
                <p className="tabular mt-1 text-title-3">{counts[item.value]}</p>
              </div>
            ))}
          </div>
        </Group>

        {dashboard.data && (
          <Banner tone="info">
            Habits inferred from these records: {dashboard.data.habits.length}. Active suggestions:{" "}
            {dashboard.data.recommendations.length}. Both are derived, and both disappear if you switch personalization
            off.
          </Banner>
        )}

        <Segmented label="Record type" options={kinds} value={kind} onChange={setKind} />

        <Section title="What reads this">
          <Group>
            <ul className="divide-hairline">
              {consumers[kind].map((consumer) => (
                <li key={consumer} className="px-5 py-3 text-callout leading-relaxed text-muted">
                  {consumer}
                </li>
              ))}
            </ul>
          </Group>
        </Section>

        <Section title="The records">
          {loading ? <SkeletonRows rows={6} /> : <Group>{renderRows()}</Group>}
          <p className="mt-3 max-w-prose px-1 text-footnote text-muted">
            Showing the most recent page from each endpoint. The export contains everything.
          </p>
        </Section>
      </div>
    </>
  );
}
