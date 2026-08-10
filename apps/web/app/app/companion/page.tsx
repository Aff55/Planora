"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarDays,
  Droplets,
  Loader2,
  Send,
  Sparkles,
  Timer,
  ListChecks
} from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Section } from "../../../components/ui/surfaces";
import { Button, inputClass } from "../../../components/ui/controls";
import { Banner, EmptyState, InfoRow, Linkified, SkeletonRows } from "../../../components/ui/feedback";
import { apiRequest, toMessage } from "../../../lib/api";
import { COMPANION_MESSAGE_LIMIT, COMPANION_TIMEOUT_MS, providerLabel } from "../../../lib/companion";
import { formatMinutes, percent } from "../../../lib/format";
import { useResource } from "../../../lib/useResource";
import type { CompanionContextResponse, CompanionReply, CompanionStatus, CompanionTurn } from "../../../lib/types";

const quickPrompts = ["What should I focus on today?", "I ate lunch", "Plan my evening", "Why did you suggest that?"];

export default function CompanionPage() {
  const status = useResource<CompanionStatus>("/companion/status");
  const context = useResource<CompanionContextResponse>("/companion/context");
  const history = useResource<{ history: CompanionTurn[] }>("/companion/history");

  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [replies, setReplies] = useState<CompanionTurn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  const turns = [...(history.data?.history ?? []), ...replies];

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setMessage("");
    setError(null);
    setPending(trimmed);

    try {
      const reply = await apiRequest<CompanionReply>("/companion/chat", {
        method: "POST",
        body: { message: trimmed },
        timeoutMs: COMPANION_TIMEOUT_MS
      });
      setReplies((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          provider: reply.provider,
          prompt: trimmed,
          response: reply.response,
          createdAt: new Date().toISOString()
        }
      ]);
      await context.reload();
    } catch (cause) {
      setError(toMessage(cause));
      setMessage(trimmed);
    } finally {
      setPending(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(message);
  }

  const snapshot = context.data?.context ?? null;
  const personalizationOn = context.data?.personalizationEnabled ?? true;
  const privacyOn = context.data?.privacyMode ?? false;
  const remaining = COMPANION_MESSAGE_LIMIT - message.length;

  return (
    <>
      <PageHeader
        eyebrow="On this machine"
        title="Companion"
        description="Short updates and planning questions, answered with the records your settings allow it to read."
        action={
          status.data && (
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-footnote text-muted">
              <span
                className={clsx("size-2 shrink-0 rounded-full", status.data.ollamaAvailable ? "bg-positive" : "bg-caution")}
                aria-hidden="true"
              />
              {providerLabel(status.data)}
            </span>
          )
        }
      />

      {status.data && !status.data.ollamaAvailable && (
        <Banner tone="info">
          <strong className="font-semibold">The local model is not reachable.</strong> The companion still answers, from
          Planora&rsquo;s built-in planning rules. Start Ollama and load <span className="font-evidence">{status.data.model}</span>{" "}
          for model-generated replies.
        </Banner>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Section>
          <Group className="flex min-h-[30rem] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {history.status === "loading" ? (
                <SkeletonRows rows={3} />
              ) : turns.length === 0 && !pending ? (
                <EmptyState
                  icon={Sparkles}
                  title="Say something short"
                  body="“I ate lunch”, “I hit chest”, or ask what would make tomorrow easier. It answers from your own records."
                />
              ) : (
                turns.map((turn) => (
                  <div key={turn.id} className="enter-row space-y-2">
                    <div className="flex justify-end">
                      <p className="max-w-[85%] break-words rounded-lg rounded-br-sm bg-accent-strong px-4 py-2.5 text-callout text-white">
                        {turn.prompt}
                      </p>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[88%] rounded-lg rounded-bl-sm bg-sunken px-4 py-2.5">
                        <p className="whitespace-pre-wrap break-words text-callout leading-relaxed">
                          <Linkified text={turn.response} />
                        </p>
                        <p className="mt-2 text-micro tracking-normal text-muted">
                          {turn.provider === "OLLAMA" ? status.data?.model ?? "Local model" : "Planora rules"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {pending && (
                <div className="enter-row space-y-2">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] break-words rounded-lg rounded-br-sm bg-accent-strong/70 px-4 py-2.5 text-callout text-white">
                      {pending}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-footnote text-muted" role="status">
                    <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                    <span>
                      {elapsed < 6
                        ? "Thinking"
                        : elapsed < 20
                          ? `Still thinking — this runs on your machine (${elapsed}s)`
                          : `Loading the model into memory. The first answer after a cold start is slow, and falls back to rules if it takes too long (${elapsed}s)`}
                    </span>
                  </div>
                </div>
              )}
              <div ref={threadEnd} />
            </div>

            <div className="border-t border-hairline p-4">
              {error && (
                <p role="alert" className="mb-3 rounded-md bg-critical-wash px-3 py-2 text-footnote font-medium text-critical">
                  {error}
                </p>
              )}
              {turns.length === 0 && !pending && (
                <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void send(prompt)}
                      className="focus-ring shrink-0 rounded-full border border-line px-3 py-2 text-footnote text-muted transition hover:bg-sunken hover:text-ink"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={onSubmit} className="flex gap-2">
                <label className="sr-only" htmlFor="companion-message">
                  Message the companion
                </label>
                <input
                  id="companion-message"
                  className={inputClass}
                  value={message}
                  maxLength={COMPANION_MESSAGE_LIMIT}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={Boolean(pending)}
                  placeholder="Short update or question"
                />
                <Button type="submit" disabled={Boolean(pending) || !message.trim()} className="shrink-0 px-4">
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  <span className="sr-only">Send</span>
                </Button>
              </form>
              {remaining < 160 && (
                <p className={clsx("mt-2 text-micro tracking-normal", remaining < 0 ? "text-critical" : "text-muted")}>
                  {remaining} of {COMPANION_MESSAGE_LIMIT} characters left
                </p>
              )}
            </div>
          </Group>
        </Section>

        <div className="space-y-6">
          <Section title="What it can see">
            {context.status === "loading" ? (
              <SkeletonRows rows={4} />
            ) : !snapshot ? (
              <Group>
                <EmptyState
                  icon={Brain}
                  title={personalizationOn ? "Context unavailable" : "Personalization is off"}
                  body={
                    personalizationOn
                      ? "The companion could not load your account context."
                      : "Chat still works. It answers generically and does not read your records."
                  }
                />
              </Group>
            ) : (
              <Group>
                <InfoRow
                  icon={ListChecks}
                  label="Tasks"
                  value={`${snapshot.counts.overdueTasks} overdue · ${snapshot.counts.todayTasks} today`}
                />
                <InfoRow icon={CalendarDays} label="Calendar" value={`${snapshot.counts.calendarEvents} events`} />
                <InfoRow icon={Activity} label="Life logged" value={formatMinutes(snapshot.life.weeklyMinutes)} />
                <InfoRow
                  icon={Droplets}
                  label="Water"
                  value={`${snapshot.wellbeing.waterTodayMl}/${snapshot.wellbeing.waterTargetMl}ml`}
                />
                <InfoRow icon={Brain} label="Learning confidence" value={percent(snapshot.learning.confidence)} />
                {snapshot.learning.focusWindow && (
                  <InfoRow icon={Timer} label="Most active window" value={snapshot.learning.focusWindow} />
                )}
              </Group>
            )}
          </Section>

          {privacyOn && (
            <Banner tone="info">
              Private mode is on, so journal entries, reflections and past conversations are withheld from context.
            </Banner>
          )}

          {snapshot && snapshot.calendar.conflicts.length > 0 && (
            <Section title="Conflicts">
              <Group>
                <div className="divide-hairline">
                  {snapshot.calendar.conflicts.slice(0, 3).map((conflict) => (
                    <p key={`${conflict.first}-${conflict.startsAt}`} className="flex items-start gap-2 px-5 py-3 text-footnote text-muted">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
                      <span>
                        “{conflict.first}” overlaps “{conflict.second}”
                      </span>
                    </p>
                  ))}
                </div>
              </Group>
            </Section>
          )}

          {snapshot && snapshot.signals.length > 0 && (
            <Section title="Signals it was given">
              <Group>
                <div className="divide-hairline">
                  {snapshot.signals.slice(0, 5).map((signal) => (
                    <p key={signal} className="px-5 py-3 text-footnote leading-relaxed text-muted">
                      {signal}
                    </p>
                  ))}
                </div>
              </Group>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
