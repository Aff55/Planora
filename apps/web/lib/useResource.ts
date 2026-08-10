"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, toMessage, type RequestOptions } from "./api";

/**
 * A small fetch-on-mount hook. Deliberately not a cache: Planora's screens are
 * read-then-act, and a stale dashboard after completing a task is worse than a
 * refetch. `reload` is what every mutation calls when it finishes.
 *
 * `status` distinguishes "loading" from "empty" so a screen can show a
 * layout-shaped skeleton first and a considered empty state second, rather
 * than flashing "nothing here" while the request is still in flight.
 */

export type ResourceStatus = "loading" | "ready" | "error";

export type Resource<T> = {
  data: T | null;
  status: ResourceStatus;
  error: string | null;
  reload: () => Promise<void>;
  /** Replace local data without a round trip, for optimistic updates. */
  set: (next: T) => void;
};

export function useResource<T>(path: string | null, options?: RequestOptions): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>(path ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);

  const method = options?.method;
  const timeoutMs = options?.timeoutMs;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!path) return;
      try {
        const next = await apiRequest<T>(path, { method, timeoutMs, signal });
        if (signal?.aborted) return;
        setData(next);
        setStatus("ready");
        setError(null);
      } catch (cause) {
        if (signal?.aborted) return;
        setError(toMessage(cause));
        setStatus("error");
      }
    },
    [path, method, timeoutMs]
  );

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setStatus("loading");
    void load(controller.signal);
    return () => controller.abort();
  }, [path, load]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  return { data, status, error, reload, set: setData };
}
