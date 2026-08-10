"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { apiRequest, toMessage } from "../../lib/api";
import { Linkified } from "../ui/feedback";
import type { CompanionReply, CompanionStatus, CompanionTurn } from "../../lib/types";
import { COMPANION_MESSAGE_LIMIT, COMPANION_TIMEOUT_MS, providerLabel } from "../../lib/companion";

/**
 * The companion, docked.
 *
 * Waiting is the hard part of this surface. A local model answers in 3-20
 * seconds, and the first request after a cold start can exceed a minute before
 * falling back to deterministic rules. So the wait is stated plainly and it
 * escalates: "Thinking" first, then an explanation of what is actually
 * happening, rather than a spinner that reveals nothing.
 */

type Bubble = { id: string; role: "user" | "assistant"; text: string; provider?: string };

const quickPrompts = ["What should I focus on today?", "I ate lunch", "Plan my evening"];

export function CompanionDock() {
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<CompanionStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    Promise.all([
      apiRequest<{ history: CompanionTurn[] }>("/companion/history"),
      apiRequest<CompanionStatus>("/companion/status")
    ])
      .then(([history, companionStatus]) => {
        setStatus(companionStatus);
        setBubbles(
          history.history.slice(-4).flatMap((turn) => [
            { id: `${turn.id}-u`, role: "user" as const, text: turn.prompt },
            { id: `${turn.id}-a`, role: "assistant" as const, text: turn.response, provider: turn.provider }
          ])
        );
      })
      .catch((cause) => setError(toMessage(cause)));
  }, [open, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Drives the escalating wait copy.
  useEffect(() => {
    if (!sending) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setInput("");
    setError(null);
    setSending(true);
    setBubbles((current) => [...current, { id: `local-${Date.now()}`, role: "user", text: trimmed }]);

    try {
      const reply = await apiRequest<CompanionReply>("/companion/chat", {
        method: "POST",
        body: { message: trimmed },
        timeoutMs: COMPANION_TIMEOUT_MS
      });
      setBubbles((current) => [
        ...current,
        { id: `reply-${Date.now()}`, role: "assistant", text: reply.response, provider: reply.provider }
      ]);
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  const remaining = COMPANION_MESSAGE_LIMIT - input.length;

  return (
    <div className="pointer-events-none fixed bottom-24 right-3 z-40 hidden sm:bottom-5 sm:right-5 sm:block">
      {open && (
        <section
          aria-label="Planora companion"
          className="enter-sheet pointer-events-auto mb-3 flex max-h-[min(32rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-floating"
        >
          <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-callout font-semibold">Companion</h2>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-footnote text-muted">
                <span
                  className={clsx("size-1.5 shrink-0 rounded-full", status?.ollamaAvailable ? "bg-positive" : "bg-caution")}
                  aria-hidden="true"
                />
                {status ? providerLabel(status) : "Checking model"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close companion"
              className="focus-ring grid size-9 shrink-0 place-items-center rounded-md text-muted transition hover:bg-sunken hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div ref={scrollRef} className="min-h-56 flex-1 space-y-3 overflow-y-auto p-3">
            {bubbles.length === 0 && !sending ? (
              <div className="px-2 py-8 text-center">
                <p className="text-callout font-semibold">Ready when you are</p>
                <p className="mx-auto mt-1.5 max-w-[18rem] text-footnote text-muted">
                  Short updates work best. It reads your tasks, calendar, life logs and wellbeing — nothing leaves this
                  machine.
                </p>
                <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
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
              </div>
            ) : (
              bubbles.map((bubble) => (
                <div key={bubble.id} className={clsx("enter-row flex", bubble.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[88%] rounded-lg px-3.5 py-2.5 text-callout",
                      bubble.role === "user"
                        ? "rounded-br-sm bg-accent-strong text-white"
                        : "rounded-bl-sm bg-sunken text-ink"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      <Linkified text={bubble.text} />
                    </p>
                    {bubble.role === "assistant" && bubble.provider && (
                      <p className="mt-1.5 text-micro text-muted">
                        {bubble.provider === "OLLAMA" ? status?.model ?? "Local model" : "Planora rules"}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-start gap-2 px-1 text-footnote text-muted" role="status">
                <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                <span>
                  {elapsed < 6
                    ? "Thinking"
                    : elapsed < 20
                      ? `Still thinking — the model runs on this machine (${elapsed}s)`
                      : `Loading the model into memory. First answer after a cold start is slow (${elapsed}s)`}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-hairline p-3">
            {error && (
              <p role="alert" className="mb-2 rounded-md bg-critical-wash px-3 py-2 text-footnote font-medium text-critical">
                {error}
              </p>
            )}
            <form onSubmit={onSubmit} className="flex gap-2">
              <label className="sr-only" htmlFor="companion-dock-input">
                Message the companion
              </label>
              <input
                id="companion-dock-input"
                value={input}
                maxLength={COMPANION_MESSAGE_LIMIT}
                onChange={(event) => setInput(event.target.value)}
                disabled={sending}
                placeholder="Short update or question"
                className="min-h-touch min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-callout outline-none transition placeholder:text-muted focus:border-accent-strong"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="focus-ring grid size-touch shrink-0 place-items-center rounded-md bg-accent-strong text-white transition active:scale-95 disabled:opacity-40"
              >
                {sending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              </button>
            </form>
            {remaining < 120 && (
              <p className={clsx("mt-1.5 text-micro", remaining < 0 ? "text-critical" : "text-muted")}>
                {remaining} characters left
              </p>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close companion" : "Open companion"}
        className="focus-ring pointer-events-auto ml-auto grid size-12 place-items-center rounded-full bg-accent-strong text-white shadow-floating transition active:scale-95"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
