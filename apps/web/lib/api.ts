/**
 * The single API client. Every request in the web app goes through here.
 *
 * Three things this module is responsible for:
 *
 * 1. Cookie auth. The session is an HttpOnly cookie scoped `Path=/api` on the
 *    API origin, so every request needs `credentials: "include"`. The cookie is
 *    invisible to JS and to the Next server — see DESIGN.md §7a.
 * 2. Bounded waiting. Nothing hangs forever; a timeout produces a sentence a
 *    person can act on rather than an unhandled rejection.
 * 3. Honest errors. The API answers a failed Zod parse with
 *    `{ error: "Validation failed", details: [{ path, message }] }`. Throwing
 *    away `details` and rendering "Request failed" is the failure mode this
 *    client exists to prevent, so `ApiError` carries the field issues and the
 *    forms read them back per field.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Default ceiling. The companion overrides it — a cold model can exceed 60s. */
const DEFAULT_TIMEOUT_MS = 15_000;

export type FieldIssue = {
  path: string;
  message: string;
};

type ErrorBody = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: FieldIssue[];

  constructor(status: number, message: string, details: FieldIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** The validation message for one field, if the server flagged it. */
  fieldMessage(path: string): string | undefined {
    return this.details.find((issue) => issue.path === path)?.message;
  }

  /**
   * A sentence worth showing. For a validation failure that means naming the
   * fields, because "Validation failed" on its own tells the user nothing.
   */
  get displayMessage(): string {
    if (this.details.length === 0) return this.message;
    return this.details.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)).join(". ");
  }
}

/** Thrown when the API could not be reached at all, as opposed to refusing. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

function parseIssues(value: unknown): FieldIssue[] {
  if (!Array.isArray(value)) return [];
  const issues: FieldIssue[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const path = typeof record.path === "string" ? record.path : "";
    const message = typeof record.message === "string" ? record.message : "";
    if (message) issues.push({ path, message });
  }
  return issues;
}

function messageFrom(body: ErrorBody, status: number): string {
  if (typeof body.error === "string" && body.error) return body.error;
  if (typeof body.message === "string" && body.message) return body.message;
  if (status === 401) return "Your session is no longer active. Sign in again.";
  if (status === 403) return "That request was refused by the server.";
  if (status === 404) return "That record no longer exists.";
  if (status === 409) return "That conflicts with something already saved.";
  if (status >= 500) return "Planora's API hit an unexpected error.";
  return "Request failed.";
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;

  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new NetworkError("Planora took too long to respond. Check the API is running, then try again.");
    }
    throw new NetworkError("Planora could not reach its API. Check the API is running on this machine.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let parsed: unknown = undefined;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const bodyObject: ErrorBody = parsed && typeof parsed === "object" ? (parsed as ErrorBody) : {};
    throw new ApiError(response.status, messageFrom(bodyObject, response.status), parseIssues(bodyObject.details));
  }

  return parsed as T;
}

/**
 * The account export. Kept separate because it returns a file rather than
 * JSON, and its format follows the account's own JSON/CSV preference.
 */
export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { credentials: "include", signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new NetworkError("Planora took too long to prepare the export. Try again.");
    }
    throw new NetworkError("Planora could not reach its API to build the export.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const raw = await response.text();
    let parsed: unknown = undefined;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = undefined;
    }
    const bodyObject: ErrorBody = parsed && typeof parsed === "object" ? (parsed as ErrorBody) : {};
    throw new ApiError(response.status, messageFrom(bodyObject, response.status));
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "planora-export";
  return { blob: await response.blob(), filename };
}

/** Any thrown value, reduced to one sentence fit for a person. */
export function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.displayMessage;
  if (error instanceof NetworkError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}
