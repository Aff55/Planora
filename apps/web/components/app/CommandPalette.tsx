"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { label as toLabel } from "../../lib/format";
import type { SearchResult } from "../../lib/types";
import { navItems } from "./nav";

/**
 * Command palette.
 *
 * Built entirely against endpoints that already exist — navigation is local,
 * and the result rows come from `GET /search?q=`. Nothing here is mocked, so
 * it carries no preview affordance.
 */

type Command =
  | { kind: "navigate"; id: string; title: string; hint: string; href: string }
  | { kind: "result"; id: string; title: string; hint: string; href: string };

const MIN_QUERY = 2;
const DEBOUNCE_MS = 180;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  // Debounced search. Aborted on every keystroke so a slow response can never
  // overwrite the results for a newer query.
  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      apiRequest<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal
      })
        .then((data) => setResults(data.results.slice(0, 8)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      setSearching(false);
    };
  }, [query, open]);

  const commands = useMemo<Command[]>(() => {
    const trimmed = query.trim().toLowerCase();
    const navigation: Command[] = navItems
      .filter((item) => !trimmed || item.label.toLowerCase().includes(trimmed) || item.hint.toLowerCase().includes(trimmed))
      .map((item) => ({ kind: "navigate", id: `nav:${item.href}`, title: item.label, hint: item.hint, href: item.href }));

    const found: Command[] = results.map((result) => ({
      kind: "result",
      id: `result:${result.type}:${result.id}`,
      title: result.title,
      hint: toLabel(result.type),
      href: result.href
    }));

    return [...navigation, ...found];
  }, [query, results]);

  useEffect(() => setActiveIndex(0), [commands.length]);

  const run = useCallback(
    (command: Command) => {
      onClose();
      router.push(command.href);
    },
    [onClose, router]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (commands.length === 0 ? 0 : (index + 1) % commands.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (commands.length === 0 ? 0 : (index - 1 + commands.length) % commands.length));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = commands[activeIndex];
      if (command) run(command);
    }
  };

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  const activeId = commands[activeIndex]?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <button type="button" aria-label="Close commands" onClick={onClose} className="fixed inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Commands"
        className="enter-sheet relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-floating"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <Search className="size-[1.125rem] shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Go to a section, or search your records"
            aria-label="Command or search"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={activeId}
            autoComplete="off"
            className="min-h-[3.25rem] w-full bg-transparent text-body outline-none placeholder:text-muted"
          />
          {searching && <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden="true" />}
        </div>

        <ul id="command-list" ref={listRef} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
          {commands.length === 0 ? (
            <li className="px-3 py-6 text-center text-callout text-muted">
              {query.trim().length < MIN_QUERY ? "Type to search your records." : "Nothing matched."}
            </li>
          ) : (
            commands.map((command, index) => {
              const active = index === activeIndex;
              return (
                <li key={command.id} id={command.id} role="option" aria-selected={active} data-active={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(command)}
                    className={clsx(
                      "focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      active ? "bg-sunken" : "hover:bg-sunken"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-callout font-medium text-ink">{command.title}</span>
                      <span className="block truncate text-footnote text-muted">{command.hint}</span>
                    </span>
                    {active && <CornerDownLeft className="size-4 shrink-0 text-muted" aria-hidden="true" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
