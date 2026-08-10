import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, ApiError, NetworkError, apiDownload, apiRequest, toMessage } from "./api";

/**
 * Tests for the single API client.
 *
 * The behaviour worth protecting here is not "it can fetch" — it is that a
 * failed request produces something a person can act on. The API answers a
 * failed Zod parse with `{ error, details: [{ path, message }] }`, and the
 * forms read those issues back per field. Dropping `details` would silently
 * turn every validation failure into "Request failed", which is exactly the
 * regression these tests exist to catch.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Stubs global fetch with a mock whose call signature is typed, so the
 * assertions below can destructure a call without casting.
 */
function mockFetch(response: Response | (() => Promise<Response>)) {
  const fn = vi.fn<(input: string, init: RequestInit) => Promise<Response>>(async () =>
    typeof response === "function" ? response() : response
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** The first call's arguments, failing loudly if fetch was never reached. */
function firstCall(fn: ReturnType<typeof mockFetch>): [string, RequestInit] {
  const call = fn.mock.calls[0];
  if (!call) throw new Error("fetch was not called");
  return call;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest — request shape", () => {
  it("always sends cookies, because the session is an HttpOnly cookie", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }));
    await apiRequest("/health");

    const [url, init] = firstCall(fetchMock);
    expect(url).toBe(`${API_URL}/health`);
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("GET");
  });

  it("serialises a body and sets Content-Type only when there is one", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }));
    await apiRequest("/tasks", { method: "POST", body: { title: "Write tests" } });

    const [, init] = firstCall(fetchMock);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "Write tests" }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("omits Content-Type on a bodyless request", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }));
    await apiRequest("/tasks");

    const [, init] = firstCall(fetchMock);
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("never attaches an Authorization header — the web client is cookie-only", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }));
    await apiRequest("/auth/me");

    const [, init] = firstCall(fetchMock);
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });
});

describe("apiRequest — responses", () => {
  it("returns parsed JSON", async () => {
    mockFetch(jsonResponse({ tasks: [{ id: "a" }] }));
    await expect(apiRequest<{ tasks: Array<{ id: string }> }>("/tasks")).resolves.toEqual({
      tasks: [{ id: "a" }]
    });
  });

  it("resolves to undefined on 204, which DELETE returns", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiRequest("/tasks/abc", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("does not throw when a successful body is empty or unparseable", async () => {
    mockFetch(new Response("", { status: 200 }));
    await expect(apiRequest("/health")).resolves.toBeUndefined();
  });
});

describe("apiRequest — error normalisation", () => {
  it("carries the server's message and status", async () => {
    mockFetch(jsonResponse({ error: "Task not found" }, 404));
    await expect(apiRequest("/tasks/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Task not found"
    });
  });

  it("keeps Zod field detail instead of collapsing it to a generic failure", async () => {
    mockFetch(
      jsonResponse(
        {
          error: "Validation failed",
          details: [
            { path: "title", message: "String must contain at least 1 character(s)" },
            { path: "progress", message: "Number must be less than or equal to 100" }
          ]
        },
        400
      )
    );

    const error = await apiRequest("/tasks", { method: "POST", body: {} }).catch((cause) => cause);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;

    expect(apiError.details).toHaveLength(2);
    expect(apiError.fieldMessage("title")).toBe("String must contain at least 1 character(s)");
    expect(apiError.fieldMessage("progress")).toBe("Number must be less than or equal to 100");
    expect(apiError.fieldMessage("nonexistent")).toBeUndefined();
  });

  it("names the offending fields in displayMessage rather than saying 'Validation failed'", async () => {
    mockFetch(
      jsonResponse({ error: "Validation failed", details: [{ path: "title", message: "Required" }] }, 400)
    );
    const error = (await apiRequest("/tasks", { method: "POST", body: {} }).catch((cause) => cause)) as ApiError;
    expect(error.displayMessage).toBe("title: Required");
  });

  it("falls back to the plain message when there is no field detail", async () => {
    mockFetch(jsonResponse({ error: "Nope" }, 409));
    const error = (await apiRequest("/tasks").catch((cause) => cause)) as ApiError;
    expect(error.displayMessage).toBe("Nope");
  });

  it("ignores malformed detail entries instead of crashing on them", async () => {
    mockFetch(jsonResponse({ error: "Validation failed", details: ["oops", null, { path: 1 }] }, 400));
    const error = (await apiRequest("/tasks").catch((cause) => cause)) as ApiError;
    expect(error.details).toEqual([]);
  });

  it("supplies a human sentence when the server sends no message at all", async () => {
    mockFetch(new Response("", { status: 401 }));
    await expect(apiRequest("/auth/me")).rejects.toMatchObject({
      status: 401,
      message: "Your session is no longer active. Sign in again."
    });
  });

  it("does not leak an HTML error page as the message", async () => {
    mockFetch(new Response("<html>500</html>", { status: 500 }));
    const error = (await apiRequest("/dashboard").catch((cause) => cause)) as ApiError;
    expect(error.message).toBe("Planora's API hit an unexpected error.");
  });
});

describe("apiRequest — transport failures", () => {
  it("reports a timeout as something the user can act on", async () => {
    mockFetch(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });

    const error = (await apiRequest("/companion/chat", { timeoutMs: 5 }).catch((cause) => cause)) as NetworkError;
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toMatch(/took too long/i);
  });

  it("reports an unreachable API distinctly from a timeout", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const error = (await apiRequest("/health").catch((cause) => cause)) as NetworkError;
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toMatch(/could not reach/i);
  });

  it("rethrows the original error when the caller aborted deliberately", async () => {
    const controller = new AbortController();
    mockFetch(async () => {
      controller.abort();
      throw new DOMException("The operation was aborted.", "AbortError");
    });

    // A caller-driven abort is a cancelled request, not a failure to report.
    const error = await apiRequest("/search?q=a", { signal: controller.signal }).catch((cause) => cause);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).not.toBeInstanceOf(NetworkError);
  });
});

describe("apiDownload", () => {
  it("reads the filename the server chose", async () => {
    mockFetch(
      new Response("id,title\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="planora-export.csv"'
        }
      })
    );

    const result = await apiDownload("/auth/export");
    expect(result.filename).toBe("planora-export.csv");
    expect(await result.blob.text()).toBe("id,title\n");
  });

  it("falls back to a sensible filename when the header is absent", async () => {
    mockFetch(new Response("{}", { status: 200 }));
    await expect(apiDownload("/auth/export")).resolves.toMatchObject({ filename: "planora-export" });
  });

  it("surfaces a refused export as an ApiError", async () => {
    mockFetch(jsonResponse({ error: "Account not found" }, 404));
    await expect(apiDownload("/auth/export")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Account not found"
    });
  });
});

describe("toMessage", () => {
  it("prefers field detail for a validation failure", () => {
    const error = new ApiError(400, "Validation failed", [{ path: "hours", message: "Too large" }]);
    expect(toMessage(error)).toBe("hours: Too large");
  });

  it("passes through network and generic errors", () => {
    expect(toMessage(new NetworkError("Offline"))).toBe("Offline");
    expect(toMessage(new Error("Boom"))).toBe("Boom");
  });

  it("never returns an empty string for an unknown throw", () => {
    expect(toMessage(undefined)).toBe("Something went wrong.");
    expect(toMessage({ weird: true })).toBe("Something went wrong.");
    expect(toMessage(new Error(""))).toBe("Something went wrong.");
  });
});
