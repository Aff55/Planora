"use client";

import { useState, type FormEvent } from "react";
import { Droplets, HeartPulse, Moon, NotebookPen, Trash2 } from "lucide-react";
import { moodValues, sleepQualities } from "@planora/shared";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Section } from "../../../components/ui/surfaces";
import { Button, Field, IconButton, Segmented, Select, inputClass, textareaClass } from "../../../components/ui/controls";
import { Banner, EmptyState, Metric, SkeletonPage } from "../../../components/ui/feedback";
import { apiRequest } from "../../../lib/api";
import { formatDateTime, label as toLabel } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useResource } from "../../../lib/useResource";
import type { WellbeingSummary } from "../../../lib/types";

type Panel = "MOOD" | "SLEEP" | "JOURNAL";

const panels = [
  { value: "MOOD" as const, label: "Mood" },
  { value: "SLEEP" as const, label: "Sleep & water" },
  { value: "JOURNAL" as const, label: "Journal" }
];

const waterPresets = [250, 350, 500];

export default function WellbeingPage() {
  const { guard } = useMessages();
  const summary = useResource<WellbeingSummary>("/wellbeing/summary");
  const [panel, setPanel] = useState<Panel>("MOOD");

  const [mood, setMood] = useState({ mood: "OKAY", stress: 5, energy: 5, reflection: "" });
  const [sleep, setSleep] = useState({ hours: 7, quality: "GOOD", notes: "" });
  const [water, setWater] = useState(250);
  const [journal, setJournal] = useState({ title: "", body: "", mood: "OKAY" });

  if (summary.status === "loading") return <SkeletonPage metrics={3} />;

  const data = summary.data;

  async function submitMood(event: FormEvent) {
    event.preventDefault();
    await guard(async () => {
      await apiRequest("/wellbeing/mood", {
        method: "POST",
        body: {
          mood: mood.mood,
          stress: Number(mood.stress),
          energy: Number(mood.energy),
          reflection: mood.reflection.trim() || null
        }
      });
      setMood({ mood: "OKAY", stress: 5, energy: 5, reflection: "" });
      await summary.reload();
    }, "Check-in saved.");
  }

  async function submitSleep(event: FormEvent) {
    event.preventDefault();
    await guard(async () => {
      await apiRequest("/wellbeing/sleep", {
        method: "POST",
        body: { hours: Number(sleep.hours), quality: sleep.quality, notes: sleep.notes.trim() || null }
      });
      setSleep({ hours: 7, quality: "GOOD", notes: "" });
      await summary.reload();
    }, "Sleep logged.");
  }

  async function logWater(amountMl: number) {
    await guard(async () => {
      await apiRequest("/wellbeing/water", { method: "POST", body: { amountMl: Number(amountMl) } });
      await summary.reload();
    }, `${amountMl}ml logged.`);
  }

  async function submitJournal(event: FormEvent) {
    event.preventDefault();
    await guard(async () => {
      await apiRequest("/wellbeing/journal", {
        method: "POST",
        body: { title: journal.title.trim(), body: journal.body.trim(), mood: journal.mood }
      });
      setJournal({ title: "", body: "", mood: "OKAY" });
      await summary.reload();
    }, "Journal entry saved.");
  }

  async function remove(kind: "mood" | "sleep" | "journal", id: string, description: string) {
    if (!window.confirm(`Delete this ${description}? This cannot be undone.`)) return;
    await guard(async () => {
      await apiRequest(`/wellbeing/${kind}/${id}`, { method: "DELETE" });
      await summary.reload();
    }, "Deleted.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Care"
        title="Wellbeing"
        description="Mood, sleep, hydration and a journal. These feed your day score and your suggestions."
      />

      {summary.status === "error" && <Banner tone="error">{summary.error ?? "Wellbeing data could not be loaded."}</Banner>}

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <Metric icon={Droplets} label="Water today" value={`${data?.waterTodayMl ?? 0}ml`} />
          <Metric icon={HeartPulse} label="Mood logs" value={data?.moodLogs.length ?? 0} detail="last 7 days" />
          <Metric icon={Moon} label="Sleep logs" value={data?.sleepLogs.length ?? 0} detail="last 7 days" />
        </div>

        <Segmented label="Wellbeing section" options={panels} value={panel} onChange={setPanel} />

        {panel === "MOOD" && (
          <Section title="How are you doing?">
            <Group>
              <form onSubmit={submitMood} className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Mood">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={mood.mood}
                        onChange={(value) => setMood({ ...mood, mood: value })}
                        options={moodValues.map((value) => ({ value, label: toLabel(value) }))}
                      />
                    )}
                  </Field>
                  <Field label="Stress" hint="1 to 10">
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        aria-describedby={describedBy}
                        className={inputClass}
                        type="number"
                        min={1}
                        max={10}
                        value={mood.stress}
                        onChange={(event) => setMood({ ...mood, stress: Number(event.target.value) })}
                      />
                    )}
                  </Field>
                  <Field label="Energy" hint="1 to 10">
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        aria-describedby={describedBy}
                        className={inputClass}
                        type="number"
                        min={1}
                        max={10}
                        value={mood.energy}
                        onChange={(event) => setMood({ ...mood, energy: Number(event.target.value) })}
                      />
                    )}
                  </Field>
                </div>
                <Field label="Reflection" hint="Optional. Kept out of model context entirely when private mode is on.">
                  {({ id, describedBy }) => (
                    <textarea
                      id={id}
                      aria-describedby={describedBy}
                      className={textareaClass}
                      value={mood.reflection}
                      onChange={(event) => setMood({ ...mood, reflection: event.target.value })}
                    />
                  )}
                </Field>
                <Button type="submit">Save check-in</Button>
              </form>
            </Group>
          </Section>
        )}

        {panel === "SLEEP" && (
          <>
            <Section title="Sleep">
              <Group>
                <form onSubmit={submitSleep} className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Hours">
                      {({ id }) => (
                        <input
                          id={id}
                          className={inputClass}
                          type="number"
                          step="0.25"
                          min={0}
                          max={24}
                          value={sleep.hours}
                          onChange={(event) => setSleep({ ...sleep, hours: Number(event.target.value) })}
                        />
                      )}
                    </Field>
                    <Field label="Quality">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={sleep.quality}
                          onChange={(value) => setSleep({ ...sleep, quality: value })}
                          options={sleepQualities.map((value) => ({ value, label: toLabel(value) }))}
                        />
                      )}
                    </Field>
                  </div>
                  <Field label="Notes" hint="Optional.">
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        aria-describedby={describedBy}
                        className={inputClass}
                        value={sleep.notes}
                        onChange={(event) => setSleep({ ...sleep, notes: event.target.value })}
                      />
                    )}
                  </Field>
                  <Button type="submit">Save sleep</Button>
                </form>
              </Group>
            </Section>

            <Section title="Water">
              <Group>
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    {waterPresets.map((amount) => (
                      <Button key={amount} variant="secondary" onClick={() => void logWater(amount)}>
                        <Droplets className="size-4" aria-hidden="true" />
                        {amount}ml
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-40 flex-1">
                      <Field label="Another amount">
                        {({ id }) => (
                          <input
                            id={id}
                            className={inputClass}
                            type="number"
                            min={1}
                            max={5000}
                            value={water}
                            onChange={(event) => setWater(Number(event.target.value))}
                          />
                        )}
                      </Field>
                    </div>
                    <Button onClick={() => void logWater(water)}>Log</Button>
                  </div>
                </div>
              </Group>
            </Section>
          </>
        )}

        {panel === "JOURNAL" && (
          <Section title="Journal">
            <Group>
              <form onSubmit={submitJournal} className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title">
                    {({ id }) => (
                      <input
                        id={id}
                        className={inputClass}
                        value={journal.title}
                        onChange={(event) => setJournal({ ...journal, title: event.target.value })}
                        maxLength={180}
                        required
                      />
                    )}
                  </Field>
                  <Field label="Mood">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={journal.mood}
                        onChange={(value) => setJournal({ ...journal, mood: value })}
                        options={moodValues.map((value) => ({ value, label: toLabel(value) }))}
                      />
                    )}
                  </Field>
                </div>
                <Field label="Entry">
                  {({ id }) => (
                    <textarea
                      id={id}
                      className={`${textareaClass} min-h-44`}
                      value={journal.body}
                      onChange={(event) => setJournal({ ...journal, body: event.target.value })}
                      required
                    />
                  )}
                </Field>
                <Button type="submit" disabled={!journal.title.trim() || !journal.body.trim()}>
                  Save entry
                </Button>
              </form>
            </Group>
            {data?.safetyNote && <p className="mt-3 max-w-prose px-1 text-footnote text-muted">{data.safetyNote}</p>}
          </Section>
        )}

        <Section title="Recent history">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-3 px-1 text-micro font-bold uppercase text-muted">Mood</h3>
              <Group>
                {(data?.moodLogs ?? []).length === 0 ? (
                  <EmptyState icon={HeartPulse} title="No check-ins" body="Mood, stress and energy appear here." />
                ) : (
                  <div className="divide-hairline">
                    {(data?.moodLogs ?? []).slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-callout font-medium">{toLabel(entry.mood)}</p>
                          <p className="mt-1 text-footnote text-muted">
                            Stress {entry.stress}/10 · Energy {entry.energy}/10 · {formatDateTime(entry.loggedAt)}
                          </p>
                        </div>
                        <IconButton
                          icon={Trash2}
                          label="Delete mood log"
                          variant="ghost"
                          onClick={() => void remove("mood", entry.id, "mood log")}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Group>
            </div>

            <div>
              <h3 className="mb-3 px-1 text-micro font-bold uppercase text-muted">Sleep</h3>
              <Group>
                {(data?.sleepLogs ?? []).length === 0 ? (
                  <EmptyState icon={Moon} title="No sleep logs" body="Hours and quality appear here." />
                ) : (
                  <div className="divide-hairline">
                    {(data?.sleepLogs ?? []).slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-callout font-medium">
                            {entry.hours}h · {toLabel(entry.quality)}
                          </p>
                          <p className="mt-1 text-footnote text-muted">{formatDateTime(entry.loggedAt)}</p>
                        </div>
                        <IconButton
                          icon={Trash2}
                          label="Delete sleep log"
                          variant="ghost"
                          onClick={() => void remove("sleep", entry.id, "sleep log")}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Group>
            </div>

            <div>
              <h3 className="mb-3 px-1 text-micro font-bold uppercase text-muted">Journal</h3>
              <Group>
                {(data?.journals ?? []).length === 0 ? (
                  <EmptyState icon={NotebookPen} title="No entries" body="Written reflections appear here." />
                ) : (
                  <div className="divide-hairline">
                    {(data?.journals ?? []).slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-callout font-medium">{entry.title}</p>
                          <p className="mt-1 text-footnote text-muted">
                            {entry.mood ? toLabel(entry.mood) : "No mood"} · {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                        <IconButton
                          icon={Trash2}
                          label={`Delete “${entry.title}”`}
                          variant="ghost"
                          onClick={() => void remove("journal", entry.id, "journal entry")}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Group>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
