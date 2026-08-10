"use client";

import { useState, type FormEvent } from "react";
import { Activity, Dumbbell, Sun, Trash2, Users, Utensils } from "lucide-react";
import { taskCategories } from "@planora/shared";
import { PageHeader } from "../../../components/app/PageHeader";
import { VoiceCapture } from "../../../components/app/VoiceCapture";
import { Group, Section, surface } from "../../../components/ui/surfaces";
import { Button, Field, IconButton, Select, inputClass } from "../../../components/ui/controls";
import { Banner, EmptyState, Metric, SkeletonPage } from "../../../components/ui/feedback";
import { apiRequest } from "../../../lib/api";
import { formatDateTime, formatMinutes, fromDateTimeLocal, label as toLabel, toDateTimeLocal } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useResource } from "../../../lib/useResource";
import type { ActivityEntry } from "../../../lib/types";

/**
 * Life logging.
 *
 * The four quick tiles cover what people actually repeat. Everything else goes
 * through the composer. This is the data the pattern and habit engines read,
 * so the bar for logging has to be low enough that an ordinary Tuesday gets
 * recorded.
 */

const quickLogs = [
  { label: "Food", title: "Ate a meal", category: "WELLBEING", minutes: 15, icon: Utensils },
  { label: "Gym", title: "Gym session", category: "FITNESS", minutes: 45, icon: Dumbbell },
  { label: "Social", title: "Called a friend", category: "SOCIAL", minutes: 10, icon: Users },
  { label: "Outside", title: "Went outside", category: "PERSONAL", minutes: 20, icon: Sun }
] as const;

type Draft = { title: string; category: string; minutes: number; occurredAt: string; notes: string };

export default function LifePage() {
  const { guard } = useMessages();
  const activities = useResource<{ today: ActivityEntry[]; recent: ActivityEntry[] }>("/activities");
  const [draft, setDraft] = useState<Draft>({
    title: "",
    category: "PERSONAL",
    minutes: 20,
    occurredAt: toDateTimeLocal(new Date()),
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  if (activities.status === "loading") return <SkeletonPage metrics={3} />;

  const today = activities.data?.today ?? [];
  const recent = activities.data?.recent ?? [];

  const fitnessMinutes = recent.filter((item) => item.category === "FITNESS").reduce((sum, item) => sum + item.minutes, 0);
  const socialCount = recent.filter((item) => item.category === "SOCIAL").length;

  async function quickLog(title: string, category: string, minutes: number) {
    await guard(async () => {
      await apiRequest("/activities", {
        method: "POST",
        body: { title, category, minutes, occurredAt: new Date().toISOString() }
      });
      await activities.reload();
    }, `${title} logged.`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    await guard(async () => {
      await apiRequest("/activities", {
        method: "POST",
        body: {
          title: draft.title.trim(),
          category: draft.category,
          minutes: Number(draft.minutes),
          occurredAt: fromDateTimeLocal(draft.occurredAt),
          notes: draft.notes.trim() || null
        }
      });
      setDraft((current) => ({ ...current, title: "", notes: "", minutes: 20, occurredAt: toDateTimeLocal(new Date()) }));
      await activities.reload();
    }, "Logged.");
    setSaving(false);
  }

  async function remove(entry: ActivityEntry) {
    if (!window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) return;
    await guard(async () => {
      await apiRequest(`/activities/${entry.id}`, { method: "DELETE" });
      await activities.reload();
    }, "Life log deleted.");
  }

  function renderList(entries: ActivityEntry[], emptyBody: string) {
    if (entries.length === 0) {
      return <EmptyState icon={Activity} title="Nothing logged" body={emptyBody} />;
    }
    return (
      <div className="divide-hairline stagger">
        {entries.map((entry) => (
          <div key={entry.id} className="enter-row flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="break-words text-callout font-medium">{entry.title}</p>
              <p className="mt-1 text-footnote text-muted">
                {toLabel(entry.category)} · {formatMinutes(entry.minutes)} · {formatDateTime(entry.occurredAt)}
              </p>
              {entry.notes && <p className="mt-1 break-words text-footnote text-muted">{entry.notes}</p>}
            </div>
            <IconButton icon={Trash2} label={`Delete “${entry.title}”`} variant="ghost" onClick={() => void remove(entry)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Daily log"
        title="Life"
        description="Meals, movement, people, time outside. Planora learns from ordinary days, not perfect ones."
      />

      {activities.status === "error" && <Banner tone="error">{activities.error ?? "Life logs could not be loaded."}</Banner>}

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <Metric icon={Activity} label="Today" value={today.length} detail={today.length === 1 ? "entry" : "entries"} />
          <Metric icon={Dumbbell} label="Movement" value={formatMinutes(fitnessMinutes)} detail="this week" />
          <Metric icon={Users} label="Social" value={socialCount} detail="this week" />
        </div>

        <Section title="Quick log">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickLogs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => void quickLog(item.title, item.category, item.minutes)}
                  className={`focus-ring raise flex min-h-touch flex-col items-start gap-3 rounded-lg p-5 text-callout font-semibold transition active:scale-[0.98] ${surface}`}
                >
                  <Icon className="size-6 text-accent-text" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Log something else">
          <Group>
            <form onSubmit={submit} className="space-y-5 p-5">
              <Field label="What happened">
                {({ id }) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="Ate rice and chicken, walked the long way home…"
                    maxLength={180}
                    required
                  />
                )}
              </Field>

              <VoiceCapture onTranscript={(text) => setDraft((current) => ({ ...current, title: text }))} />

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Type">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={draft.category}
                      onChange={(value) => setDraft({ ...draft, category: value })}
                      options={taskCategories.map((value) => ({ value, label: toLabel(value) }))}
                    />
                  )}
                </Field>
                <Field label="Minutes">
                  {({ id }) => (
                    <input
                      id={id}
                      className={inputClass}
                      type="number"
                      min={0}
                      max={1440}
                      value={draft.minutes}
                      onChange={(event) => setDraft({ ...draft, minutes: Number(event.target.value) })}
                    />
                  )}
                </Field>
                <Field label="When">
                  {({ id }) => (
                    <input
                      id={id}
                      className={inputClass}
                      type="datetime-local"
                      value={draft.occurredAt}
                      onChange={(event) => setDraft({ ...draft, occurredAt: event.target.value })}
                    />
                  )}
                </Field>
              </div>

              <Field label="Note" hint="Optional.">
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    className={inputClass}
                    value={draft.notes}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  />
                )}
              </Field>

              <Button type="submit" disabled={saving || !draft.title.trim()}>
                {saving ? "Saving" : "Log it"}
              </Button>
            </form>
          </Group>
        </Section>

        <Section title="Today">
          <Group>{renderList(today, "Nothing logged today yet. One tap above is enough.")}</Group>
        </Section>

        <Section title="This week">
          <Group>{renderList(recent.slice(0, 20), "Nothing logged in the last seven days.")}</Group>
        </Section>
      </div>
    </>
  );
}
