"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { useTheme } from "./theme";
import type { AccountSettings, CurrentUser } from "./types";

/**
 * The client-side auth boundary.
 *
 * The session cookie is `HttpOnly; SameSite=Lax; Path=/api` on the API origin,
 * so neither JS nor the Next server can read it (DESIGN.md §7a). The only way
 * to know whether someone is signed in is to ask the API. Everything under
 * /app therefore waits on one `GET /auth/me` probe.
 *
 * "unknown" is a distinct state from "anonymous" on purpose: rendering the
 * sign-in prompt while the probe is still in flight would flash the wrong
 * screen at every already-signed-in user on every cold load.
 */

export type SessionStatus = "unknown" | "authenticated" | "anonymous";

export const defaultSettings: AccountSettings = {
  theme: "SYSTEM",
  notificationEmail: false,
  notificationPush: false,
  privacyMode: false,
  aiPersonalization: true,
  exportFormat: "JSON"
};

type SessionValue = {
  status: SessionStatus;
  user: CurrentUser | null;
  settings: AccountSettings;
  /** Re-reads the account from the API, e.g. after saving the profile. */
  refresh: () => Promise<void>;
  /** Called by the auth screen once credentials are accepted. */
  adopt: (user: CurrentUser) => void;
  /** Local echo so a settings save reflects instantly without a refetch. */
  applySettings: (settings: AccountSettings) => void;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("unknown");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const { setPreference } = useTheme();

  const settings = user?.settings ?? defaultSettings;

  /** Account theme wins over the local guess, without writing back to storage. */
  const syncThemeFromAccount = useCallback(
    (next: CurrentUser | null) => {
      const accountTheme = next?.settings?.theme;
      if (accountTheme) setPreference(accountTheme, { persistLocally: false });
    },
    [setPreference]
  );

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ user: CurrentUser }>("/auth/me")
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus("authenticated");
        syncThemeFromAccount(data.user);
      })
      .catch(() => {
        if (cancelled) return;
        // A 401 here is the normal signed-out path, not an error worth showing.
        setStatus("anonymous");
        setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [syncThemeFromAccount]);

  const refresh = useCallback(async () => {
    const data = await apiRequest<{ user: CurrentUser }>("/auth/me");
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const adopt = useCallback(
    (next: CurrentUser) => {
      setUser(next);
      setStatus("authenticated");
      syncThemeFromAccount(next);
    },
    [syncThemeFromAccount]
  );

  const applySettings = useCallback((next: AccountSettings) => {
    setUser((current) => (current ? { ...current, settings: next } : current));
  }, []);

  const signOut = useCallback(async () => {
    // Clear locally even if the network call fails: the cookie is cleared by
    // the API on success, and leaving the UI "signed in" after an explicit
    // sign-out is worse than an optimistic clear the next probe corrects.
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const signOutEverywhere = useCallback(async () => {
    await apiRequest("/auth/logout-all", { method: "POST" });
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status, user, settings, refresh, adopt, applySettings, signOut, signOutEverywhere }),
    [status, user, settings, refresh, adopt, applySettings, signOut, signOutEverywhere]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

/**
 * The authenticated user, for screens that only render after the gate has
 * already established there is one.
 */
export function useAccount(): { user: CurrentUser; settings: AccountSettings } {
  const { user, settings } = useSession();
  if (!user) throw new Error("useAccount used outside an authenticated route");
  return { user, settings };
}
