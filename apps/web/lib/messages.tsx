"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toMessage } from "./api";

/**
 * One place for the app's transient messages.
 *
 * Success notices clear themselves, because a confirmation that lingers turns
 * into clutter. Errors stay until dismissed, because they may need action.
 * Both are announced: notices politely, errors assertively.
 */

type Message = { tone: "success" | "error"; text: string } | null;

type MessagesValue = {
  message: Message;
  notify: (text: string) => void;
  fail: (error: unknown) => void;
  clear: () => void;
  /**
   * Runs an action, reporting failure through `fail` and returning whether it
   * succeeded, so callers can roll back optimistic UI.
   */
  guard: (run: () => Promise<void>, success?: string) => Promise<boolean>;
};

const MessagesContext = createContext<MessagesValue | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (message?.tone !== "success") return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const notify = useCallback((text: string) => setMessage({ tone: "success", text }), []);
  const fail = useCallback((error: unknown) => setMessage({ tone: "error", text: toMessage(error) }), []);
  const clear = useCallback(() => setMessage(null), []);

  const guard = useCallback(
    async (run: () => Promise<void>, success?: string) => {
      try {
        await run();
        if (success) setMessage({ tone: "success", text: success });
        return true;
      } catch (error) {
        setMessage({ tone: "error", text: toMessage(error) });
        return false;
      }
    },
    []
  );

  const value = useMemo<MessagesValue>(
    () => ({ message, notify, fail, clear, guard }),
    [message, notify, fail, clear, guard]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesValue {
  const value = useContext(MessagesContext);
  if (!value) throw new Error("useMessages must be used inside MessagesProvider");
  return value;
}
