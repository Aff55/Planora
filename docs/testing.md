# Testing

## Automated Release Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd --workspace @planora/mobile run doctor
npm.cmd audit
npm.cmd --workspace @planora/api run prisma:deploy
npm.cmd run verify:live
```

Vitest covers shared validation, bounded pagination, timezone/day boundaries, runtime proxy configuration, malformed JSON, API security headers, authentication behavior, unavailable password reset, recurrence inputs, task reordering, single-flight generation, and companion/privacy guardrails. ESLint runs noninteractively with warnings treated as failures. The production build verifies shared, API, and Next.js compilation, and Expo Doctor validates the native dependency/config set.

`verify:live` expects the API, PostgreSQL, Redis, and the configured companion provider to be running. It creates an isolated temporary account, exercises the release-critical API workflows, proves session revocation and account deletion, and removes its test data before exiting. Set `PLANORA_API_URL` to target a non-default deployment.

## Required Manual Journeys

- Register, restore the session, log out, and verify the old session cannot be reused.
- Create, edit, complete, recur, reorder, and delete tasks and subtasks.
- Add/edit/delete calendar events and verify local-month filtering.
- Quick-log food, fitness, social, and outdoor activity; confirm a new local day preserves history while resetting today's view.
- Add and delete mood, sleep, water, and journal entries.
- Verify companion context, three-to-five-turn coherence, unsupported-topic filtering, Ollama fallback, and personalization/privacy gates.
- Apply recommendation feedback once and confirm it does not replay.
- Export JSON/CSV, clear AI data, and delete an account with password and email confirmation.
- Exercise mobile notification permission, scheduling, cancellation, generic lock-screen content, and deep links.
- Test web and native layouts in light/dark/system themes at phone, tablet, and desktop sizes.

## Local Smoke Endpoints

```powershell
curl.exe http://localhost:4000/api/health
curl.exe -X POST http://localhost:4000/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"demo@planora.local\",\"password\":\"Planora123!\",\"rememberMe\":true}"
```
