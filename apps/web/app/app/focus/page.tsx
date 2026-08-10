"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, ListChecks } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Panel } from "../../../components/ui/surfaces";
import { Button } from "../../../components/ui/controls";
import { Banner, EmptyState, SkeletonPage } from "../../../components/ui/feedback";
import { apiRequest } from "../../../lib/api";
import { formatDateTime, formatLongDate, relativeDay } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useResource } from "../../../lib/useResource";
import type { DashboardData } from "../../../lib/types";

/**
 * Focus mode.
 *
 * One task, nothing else. The dashboard answers "what is my day"; this answers
 * "what am I doing right now", which is a different question and deserves a
 * surface that does not offer anything to click away to.
 *
 * Order matches how the day actually presses: overdue and due-today first, then
 * whatever is next.
 */
export default function FocusPage() {
  const { guard } = useMessages();
  const dashboard = useResource<DashboardData>("/dashboard");
  const [done, setDone] = useState<string[]>([]);

  if (dashboard.status === "loading") return <SkeletonPage metrics={0} rows={2} />;
  if (dashboard.status === "error" || !dashboard.data) {
    return (
      <>
        <PageHeader title="Focus" />
        <Banner tone="error">{dashboard.error ?? "Could not load your day."}</Banner>
      </>
    );
  }

  const queue = [...dashboard.data.todayTasks, ...dashboard.data.upcomingTasks].filter((task) => !done.includes(task.id));
  const current = queue[0];
  const next = queue.slice(1, 4);

  async function complete(taskId: string) {
    setDone((list) => [...list, taskId]);
    const ok = await guard(async () => {
      await apiRequest(`/tasks/${taskId}/complete`, { method: "PATCH", body: { completed: true } });
      await dashboard.reload();
    }, "Done.");
    if (!ok) setDone((list) => list.filter((id) => id !== taskId));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/app" className="focus-ring inline-flex min-h-touch items-center gap-2 rounded-md text-footnote font-semibold text-muted">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to today
        </Link>
      </div>

      <PageHeader eyebrow={formatLongDate(new Date())} title="Focus" />

      {!current ? (
        <Group>
          <EmptyState
            icon={ListChecks}
            title="Nothing queued"
            body="No task is due today or coming up. That is a finished list, not an empty one."
            action={
              <Link
                href="/app/tasks"
                className="focus-ring inline-flex min-h-touch items-center rounded-md border border-line bg-surface px-4 text-callout font-semibold"
              >
                Open tasks
              </Link>
            }
          />
        </Group>
      ) : (
        <>
          <Panel className="text-center">
            <p className="text-micro font-bold uppercase text-muted">Right now</p>
            <h2 className="mt-4 break-words text-title-1">{current.title}</h2>
            <p className="mt-3 text-callout text-muted">
              {current.dueDate ? relativeDay(current.dueDate) ?? formatDateTime(current.dueDate) : "No due date"} ·{" "}
              {current.priority.toLowerCase()} · {current.category.toLowerCase()}
            </p>
            {current.description && (
              <p className="mx-auto mt-4 max-w-prose break-words text-callout leading-relaxed text-muted">
                {current.description}
              </p>
            )}
            <div className="mt-8 flex justify-center">
              <Button onClick={() => void complete(current.id)}>
                <Check className="size-4" aria-hidden="true" />
                Mark it done
              </Button>
            </div>
          </Panel>

          {next.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 px-1 text-micro font-bold uppercase text-muted">After that</h3>
              <Group>
                <div className="divide-hairline">
                  {next.map((task) => (
                    <p key={task.id} className="break-words px-5 py-3 text-callout text-muted">
                      {task.title}
                    </p>
                  ))}
                </div>
              </Group>
            </div>
          )}
        </>
      )}
    </div>
  );
}
