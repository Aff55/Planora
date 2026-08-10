"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  HeartPulse,
  ListChecks,
  MessageCircle,
  Moon,
  Sparkles,
  Users
} from "lucide-react";
import { PageHeader } from "../../components/app/PageHeader";
import { RecommendationCard } from "../../components/app/RecommendationCard";
import { Group, Panel, Section, surface } from "../../components/ui/surfaces";
import { Banner, CountUp, EmptyState, InfoRow, Metric, SkeletonPage } from "../../components/ui/feedback";
import { apiRequest } from "../../lib/api";
import { formatDateTime, formatLongDate, formatMinutes, relativeDay } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { useAccount } from "../../lib/session";
import { useResource } from "../../lib/useResource";
import type { DashboardData } from "../../lib/types";

/**
 * Today.
 *
 * Scanned in five seconds, so it is ordered by what needs a decision: what is
 * due, then what is coming, then what Planora noticed. Figures come straight
 * from `GET /dashboard`; nothing on this page is derived client-side.
 */
/**
 * The API still emits action URLs from when the app lived at the site root
 * ("/tasks", "/wellbeing", "/"). Rewritten here rather than changing the
 * backend, which is out of scope.
 */
function toAppHref(actionUrl: string): string {
  if (actionUrl === "/") return "/app";
  return actionUrl.startsWith("/app") ? actionUrl : `/app${actionUrl}`;
}

export default function DashboardPage() {
  const { user } = useAccount();
  const { guard } = useMessages();
  const dashboard = useResource<DashboardData>("/dashboard");
  /** Ticked rows hide immediately so the tap lands; reconciled on reload. */
  const [completing, setCompleting] = useState<string[]>([]);
  const [busyRecommendation, setBusyRecommendation] = useState<string | null>(null);

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  if (dashboard.status === "loading") return <SkeletonPage />;

  if (dashboard.status === "error" || !dashboard.data) {
    return (
      <>
        <PageHeader title="Today" description="Your day at a glance." />
        <Banner tone="error">{dashboard.error ?? "The dashboard could not be loaded."}</Banner>
      </>
    );
  }

  const data = dashboard.data;
  const visibleToday = data.todayTasks.filter((task) => !completing.includes(task.id));
  const hydrationPct = data.waterIntake.targetMl > 0 ? data.waterIntake.todayMl / data.waterIntake.targetMl : 0;

  async function completeTask(taskId: string) {
    setCompleting((current) => [...current, taskId]);
    await guard(async () => {
      await apiRequest(`/tasks/${taskId}/complete`, { method: "PATCH", body: { completed: true } });
      await dashboard.reload();
    }, "Task completed.");
    // Either way the id is dropped: on success the reloaded list no longer
    // contains the task, and on failure the row has to come back.
    setCompleting((current) => current.filter((id) => id !== taskId));
  }

  async function sendFeedback(id: string, action: "ACCEPTED" | "DISMISSED") {
    setBusyRecommendation(id);
    await guard(async () => {
      await apiRequest(`/recommendations/${id}/feedback`, { method: "POST", body: { action } });
      await dashboard.reload();
    });
    setBusyRecommendation(null);
  }

  return (
    <>
      <PageHeader eyebrow={formatLongDate(new Date())} title={`Good to see you, ${firstName}`} />

      <div className="space-y-10">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Metric icon={BarChart3} label="Day score" value={<CountUp value={data.productivityScore} />} detail="out of 100" />
          <Metric icon={Flame} label="Streak" value={<CountUp value={data.streak} />} detail={data.streak === 1 ? "day" : "days"} />
          <Metric
            icon={Activity}
            label="Active this week"
            value={formatMinutes(data.lifeSummary.weeklyMinutes)}
            detail={`${data.weeklyStatistics.completedTasks} tasks finished`}
          />
          <Metric
            icon={Droplets}
            label="Water today"
            value={
              <>
                <CountUp value={data.waterIntake.todayMl} />
                <span className="text-muted">/{data.waterIntake.targetMl}ml</span>
              </>
            }
            detail={hydrationPct >= 1 ? "Target met" : `${Math.round(hydrationPct * 100)}% of target`}
          />
        </div>

        <Section
          title="Due today"
          action={
            <span className="flex items-center gap-4">
              <Link href="/app/focus" className="focus-ring rounded px-1 text-footnote font-semibold text-accent-text">
                Focus mode
              </Link>
              <Link href="/app/tasks" className="focus-ring rounded px-1 text-footnote font-semibold text-accent-text">
                All tasks
              </Link>
            </span>
          }
        >
          <Group>
            {visibleToday.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Nothing due today"
                body="A clear day is a legitimate result. Pull something forward when you are ready."
                action={
                  <Link
                    href="/app/tasks"
                    className="focus-ring inline-flex min-h-touch items-center rounded-md border border-line bg-surface px-4 text-callout font-semibold"
                  >
                    Open tasks
                  </Link>
                }
              />
            ) : (
              <div className="divide-hairline stagger">
                {visibleToday.map((task) => (
                  <div key={task.id} className="enter-row row-hover flex items-center gap-4 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => void completeTask(task.id)}
                      aria-label={`Mark "${task.title}" complete`}
                      className="focus-ring grid size-7 shrink-0 place-items-center rounded-full border-2 border-line text-transparent transition duration-state hover:border-positive hover:text-positive active:scale-90"
                    >
                      <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-callout font-medium">{task.title}</p>
                      <p className="mt-1 text-footnote text-muted">
                        {task.category.toLowerCase()} · {task.priority.toLowerCase()}
                        {task.progress > 0 && task.progress < 100 ? ` · ${task.progress}%` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Group>
          {data.todayTasksHasMore && (
            <p className="mt-2 px-1 text-footnote text-muted">
              Showing the first {data.todayTasks.length}. <Link href="/app/tasks" className="text-accent-text underline">See the rest</Link>.
            </p>
          )}
        </Section>

        <Section title="Jump to">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.quickActions.map((action) => (
              <Link
                key={action.href}
                href={toAppHref(action.href)}
                className={`focus-ring raise flex min-h-touch items-center justify-between gap-2 rounded-lg px-5 py-4 text-callout font-semibold active:scale-[0.98] ${surface}`}
              >
                <span className="truncate">{action.label}</span>
                <ChevronRight className="nudge size-[1.125rem] shrink-0 text-accent-text" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Section>

        <div className="grid gap-8 xl:grid-cols-2">
          <Section
            title="Coming up"
            action={
              <Link href="/app/tasks" className="focus-ring rounded px-1 text-footnote font-semibold text-accent-text">
                Tasks
              </Link>
            }
          >
            <Group>
              {data.upcomingTasks.length === 0 ? (
                <EmptyState icon={ListChecks} title="Nothing scheduled ahead" body="Tasks with a due date appear here." />
              ) : (
                <div className="divide-hairline stagger">
                  {data.upcomingTasks.map((task) => (
                    <div key={task.id} className="enter-row flex items-center gap-4 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-callout font-medium">{task.title}</p>
                        <p className="mt-1 text-footnote text-muted">
                          {relativeDay(task.dueDate) ?? formatDateTime(task.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Group>
          </Section>

          <Section
            title="Calendar"
            action={
              <Link href="/app/calendar" className="focus-ring rounded px-1 text-footnote font-semibold text-accent-text">
                Calendar
              </Link>
            }
          >
            <Group>
              {data.calendarEvents.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No events in the next two weeks" body="Add one when something belongs on a specific day." />
              ) : (
                <div className="divide-hairline stagger">
                  {data.calendarEvents.map((event) => (
                    <div key={event.id} className="enter-row flex items-center gap-4 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-callout font-medium">{event.title}</p>
                        <p className="mt-1 text-footnote text-muted">
                          {formatDateTime(event.startAt)} · {event.type.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Group>
          </Section>
        </div>

        <Section
          title="Wellbeing"
          action={
            <Link href="/app/wellbeing" className="focus-ring rounded px-1 text-footnote font-semibold text-accent-text">
              Log
            </Link>
          }
        >
          <Group>
            <InfoRow
              icon={HeartPulse}
              label="Mood, 7 day average"
              value={data.moodSummary.averageMood === null ? "No logs" : `${data.moodSummary.averageMood}/5`}
            />
            <InfoRow
              icon={Moon}
              label="Sleep, 7 day average"
              value={data.sleepSummary.averageHours === null ? "No logs" : `${data.sleepSummary.averageHours}h`}
            />
            <InfoRow icon={Dumbbell} label="Movement this week" value={formatMinutes(data.lifeSummary.fitnessMinutes)} />
            <InfoRow
              icon={Users}
              label="Social touchpoints"
              value={`${data.lifeSummary.socialCount} logged`}
            />
          </Group>
        </Section>

        <Section
          title="What Planora noticed"
          action={
            <Link href="/app/insights" className="focus-ring rounded px-1 text-footnote font-semibold text-accent-text">
              Insights
            </Link>
          }
        >
          <Group>
            {data.recommendations.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nothing to suggest yet"
                body="Suggestions come from your own records. Log a few ordinary days and they will appear."
              />
            ) : (
              <div className="divide-hairline stagger">
                {data.recommendations.slice(0, 3).map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    busy={busyRecommendation === recommendation.id}
                    onAccept={() => void sendFeedback(recommendation.id, "ACCEPTED")}
                    onDismiss={() => void sendFeedback(recommendation.id, "DISMISSED")}
                  />
                ))}
              </div>
            )}
          </Group>
        </Section>

        <Section title="Companion">
          <Panel className={surface}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-prose text-callout leading-relaxed text-muted">
                {data.aiCompanion.latestMessage ?? data.aiCompanion.prompt}
              </p>
              <Link
                href="/app/companion"
                className="focus-ring inline-flex min-h-touch shrink-0 items-center gap-2 rounded-md border border-line bg-surface px-4 text-callout font-semibold"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Open companion
              </Link>
            </div>
          </Panel>
        </Section>
      </div>
    </>
  );
}
