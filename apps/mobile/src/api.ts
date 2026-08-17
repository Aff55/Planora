import Constants from "expo-constants";
import { Platform } from "react-native";

const apiUrlFromConfig = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000/api";

export const defaultApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:4000/api" : apiUrlFromConfig);

/**
 * Whether to show developer tooling in the UI.
 *
 * Expo Go always runs with __DEV__ === true, so gating on that alone put a
 * "Development API" field on the sign-in screen and a "Development server" card
 * in Settings for every user of the app - including anyone being shown a demo.
 *
 * This is opt-in instead: set EXPO_PUBLIC_SHOW_DEV_TOOLS=1 when you need to
 * point the app at a different server by hand. Default is off, so the app
 * presents as a finished product.
 *
 * Note this deliberately does NOT gate the HTTPS requirement below - that stays
 * tied to __DEV__, because it is a security guard rather than a convenience.
 */
export const showDevTools = __DEV__ && process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === "1";

export function normalizeApiUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a complete Planora API URL.");
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("The API URL must use HTTP or HTTPS.");
  }
  if (!__DEV__ && parsed.protocol !== "https:") {
    throw new Error("Production builds require an HTTPS API URL.");
  }
  if (!parsed.pathname.endsWith("/api")) {
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/api`;
  }
  return parsed.toString().replace(/\/+$/, "");
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  apiUrl: string,
  path: string,
  options: RequestInit & { token?: string | null; timeoutMs?: number } = {}
): Promise<T> {
  const resolvedApiUrl = normalizeApiUrl(apiUrl);
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const { signal: callerSignal, token: _token, timeoutMs = 15_000, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  let response: Response;
  try {
    response = await fetch(`${resolvedApiUrl}${path}`, {
      ...requestOptions,
      headers,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Planora took too long to respond. Try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!response.ok) throw new ApiError(response.status, data.error ?? data.message ?? "Request failed");
  return data as T;
}

export async function apiDownloadText(apiUrl: string, path: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(`${normalizeApiUrl(apiUrl)}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Planora took too long to prepare the export. Try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(response.status, data.error ?? data.message ?? "Export failed");
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "planora-export.json";
  return { filename, text: await response.text() };
}

export function toDateTimeLocal(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
