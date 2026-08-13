const apiBase = (process.env.PLANORA_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const password = "PlanoraSmoke123!";
const email = `release-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
let token;
let accountExists = false;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", body, expected = 200, auth = true, timeoutMs = 45_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const allowed = Array.isArray(expected) ? expected : [expected];
    const text = await response.text();
    const data = text && response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : text;
    if (!allowed.includes(response.status)) {
      throw new Error(`${method} ${path} returned ${response.status}: ${text.slice(0, 300)}`);
    }
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function deleteSmokeAccount() {
  if (!accountExists) return;
  if (!token) {
    const login = await request("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password, rememberMe: false }
    });
    token = login.data.token;
  }
  await request("/auth/account", {
    method: "DELETE",
    expected: 204,
    body: { emailConfirmation: email, currentPassword: password }
  });
  accountExists = false;
  token = undefined;
}

try {
  const health = await request("/health", { auth: false });
  assert(health.data.ok && health.data.db?.ok, "API health check did not confirm the database");

  const registration = await request("/auth/register", {
    method: "POST",
    expected: 201,
    auth: false,
    body: {
      name: "Release Smoke",
      email,
      password,
      timezone: "Asia/Kuala_Lumpur",
      rememberMe: false
    }
  });
  accountExists = true;
  token = registration.data.token;
  assert(token, "Registration did not return a native-client token");
  assert(registration.data.user?.timezone === "Asia/Kuala_Lumpur", "Registration did not persist the client timezone");

  const savedProfile = await request("/profile", {
    method: "PUT",
    body: {
      lifeStage: "WORKING_PROFESSIONAL",
      profession: "Release tester",
      heightCm: 175,
      weightKg: 72,
      activityLevel: "MODERATELY_ACTIVE",
      interests: ["Cooking", "Strength training"],
      primaryGoals: ["Keep a balanced weekly routine"],
      preferredWakeTime: "07:30",
      preferredSleepTime: "23:00",
      improvementStyle: "BALANCED",
      useForPersonalization: true,
      allowAnonymousTraining: true
    }
  });
  assert(savedProfile.data.profile?.useForPersonalization, "Profile personalization consent was not persisted");
  const loadedProfile = await request("/profile");
  assert(loadedProfile.data.profile?.profession === "Release tester", "Saved personal profile was not returned");

  const now = Date.now();
  const task = await request("/tasks", {
    method: "POST",
    expected: 201,
    body: {
      title: "Release smoke task",
      category: "WORK",
      priority: "HIGH",
      dueDate: new Date(now + 30 * 60_000).toISOString(),
      subtasks: [{ title: "Verify persistence" }]
    }
  });
  await request("/activities", {
    method: "POST",
    expected: 201,
    body: { title: "Release smoke walk", category: "FITNESS", minutes: 20 }
  });
  await request("/wellbeing/water", { method: "POST", expected: 201, body: { amountMl: 350 } });
  await request("/wellbeing/mood", {
    method: "POST",
    expected: 201,
    body: { mood: "GOOD", stress: 3, energy: 7, reflection: "Release smoke check" }
  });
  await request("/wellbeing/sleep", {
    method: "POST",
    expected: 201,
    body: { hours: 7.5, quality: "GOOD", notes: "Release smoke check" }
  });
  await request("/wellbeing/journal", {
    method: "POST",
    expected: 201,
    body: { title: "Release smoke journal", body: "Verifying persisted personal context." }
  });
  const calendar = await request("/calendar", {
    method: "POST",
    expected: 201,
    body: {
      title: "Release smoke event",
      type: "PERSONAL",
      startAt: new Date(now + 60 * 60_000).toISOString(),
      endAt: new Date(now + 90 * 60_000).toISOString()
    }
  });

  const tasks = await request("/tasks?search=Release%20smoke");
  assert(tasks.data.tasks.some((item) => item.id === task.data.task.id), "Created task was not returned by task search");
  const events = await request("/calendar");
  assert(events.data.events.some((item) => item.id === calendar.data.event.id), "Created event was not returned by calendar");
  const search = await request("/search?q=Release%20smoke");
  assert(search.data.results.some((item) => item.type === "task"), "Global search did not return the created task");

  const dashboard = await request("/dashboard");
  assert(dashboard.data.waterIntake?.todayMl >= 350, "Dashboard did not include the new water log");
  assert(dashboard.data.lifeSummary?.fitnessMinutes >= 20, "Dashboard did not include the new life log");
  assert(Array.isArray(dashboard.data.recommendations), "Dashboard recommendations were not returned");

  const companionStatus = await request("/companion/status");
  assert(companionStatus.data.provider, "No companion provider is available");
  assert(companionStatus.data.ollamaAvailable, `Configured Ollama model ${companionStatus.data.model ?? ""} is unavailable`);
  const companion = await request("/companion/chat", {
    method: "POST",
    expected: 201,
    timeoutMs: 90_000,
    body: { message: "I ate a balanced release smoke lunch today" }
  });
  assert(typeof companion.data.response === "string" && companion.data.response.length > 0, "Companion returned no response");
  assert(!/Planora:\s*Planora:/i.test(companion.data.response), "Companion repeated its own label");
  const modelCompanion = await request("/companion/chat", {
    method: "POST",
    expected: 201,
    timeoutMs: 90_000,
    body: { message: "Good morning, I have a busy day." }
  });
  assert(modelCompanion.data.provider === "OLLAMA", "The open-ended companion response did not use Ollama");
  assert(typeof modelCompanion.data.response === "string" && modelCompanion.data.response.length > 0, "Ollama returned no response");
  assert(!/Planora:\s*Planora:/i.test(modelCompanion.data.response), "Ollama repeated its own label");
  const companionContext = await request("/companion/context");
  assert(companionContext.data.context?.profile?.profession === "Release tester", "Companion context did not include the consented profile");

  const rankerStatus = await request("/ranker/status");
  assert(typeof rankerStatus.data.status?.engagement?.score === "number", "Ranker status did not include engagement signals");
  assert(Array.isArray(rankerStatus.data.status?.detectedHabits), "Ranker status did not include detected routines");
  const trainingManifest = await request("/ranker/training-manifest?limit=50");
  assert(trainingManifest.data.manifest?.eligible === true, "Training manifest did not honor anonymous training consent");
  assert(!("userId" in trainingManifest.data.manifest), "Training manifest exposed the raw user id");

  const exported = await request("/auth/export");
  assert(typeof exported.data === "object" && Array.isArray(exported.data.account?.tasks), "Account export did not contain task data");
  assert(exported.data.account?.personalProfile?.profession === "Release tester", "Account export did not contain the personal profile");

  await request("/auth/logout", { method: "POST" });
  const revoked = await request("/auth/me", { expected: 401 });
  assert(revoked.status === 401, "Logout did not revoke the active session");
  token = undefined;

  const login = await request("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password, rememberMe: false }
  });
  token = login.data.token;
  assert(login.data.user?.timezone === "Asia/Kuala_Lumpur", "Timezone was not retained after login");

  await deleteSmokeAccount();
  const deletedLogin = await request("/auth/login", {
    method: "POST",
    auth: false,
    expected: 401,
    body: { email, password, rememberMe: false }
  });
  assert(deletedLogin.status === 401, "Deleted account could still log in");

  console.log(JSON.stringify({
    ok: true,
    apiBase,
    checks: [
      "health and database",
      "timezone-aware registration",
      "consent-aware personal profile",
      "task and subtask persistence",
      "life and wellbeing persistence",
      "calendar and global search",
      "live dashboard and recommendations",
      `guarded companion provider: ${companion.data.provider}`,
      `open-ended companion provider: ${modelCompanion.data.provider}`,
      "profile-aware context and ranker status",
      "pseudonymous training manifest",
      "account export",
      "logout revocation and re-login",
      "typed account deletion"
    ]
  }, null, 2));
} catch (error) {
  try {
    token = undefined;
    await deleteSmokeAccount();
  } catch (cleanupError) {
    console.error(`Smoke account cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
  }
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
