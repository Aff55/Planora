# API

All routes are under `/api`. Browser clients authenticate with an `HttpOnly` session cookie. Native clients receive the same signed token and send it as `Authorization: Bearer <token>`. Sessions are stored server-side, expire, and are revoked on logout.

Unsafe cookie-authenticated requests must come from an allowed `WEB_ORIGIN`. JSON bodies are limited to 1 MB, validated with shared Zod schemas, and protected by global and authentication-specific rate limits.

## Public

- `GET /api/health`
- `POST /api/auth/register` accepts the client IANA `timezone` so day boundaries are correct immediately
- `POST /api/auth/login`
- `POST /api/auth/forgot-password` returns `501` until email delivery is configured

## Account

- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/settings`
- `GET /api/auth/export`
- `DELETE /api/auth/ai-data`
- `DELETE /api/auth/account` requires the current password and exact email confirmation

## Tasks And Dashboard

- `GET|POST /api/tasks`
- `POST /api/tasks/reorder`
- `GET|PUT|DELETE /api/tasks/:id`
- `PATCH /api/tasks/:id/complete`
- `POST /api/tasks/:id/subtasks`
- `PATCH|DELETE /api/tasks/:id/subtasks/:subtaskId`
- `GET /api/dashboard`

Task filters accept `search`, `status`, and `category`. Task and calendar lists accept `limit` (1-100) and an optional `cursor`, then return `pageInfo: { hasMore, nextCursor, limit }`. Calendar lists also accept a validated `YYYY-MM` month. Completing a daily, weekly, or monthly recurring task creates its next occurrence once.

## Life And Wellbeing

- `GET|POST /api/activities`
- `PATCH|DELETE /api/activities/:id`
- `GET /api/wellbeing/summary`
- `GET|POST /api/wellbeing/mood`
- `DELETE /api/wellbeing/mood/:id`
- `GET|POST /api/wellbeing/sleep`
- `DELETE /api/wellbeing/sleep/:id`
- `GET|POST /api/wellbeing/water`
- `DELETE /api/wellbeing/water/:id`
- `GET|POST /api/wellbeing/journal`
- `PUT|DELETE /api/wellbeing/journal/:id`

Daily and rolling summaries use the account's validated IANA timezone.

Creation limits are enforced transactionally per account. Defaults allow multi-year history while bounding exports and storage: 20 active sessions, 2,000 tasks, 5,000 calendar events, 10,000 life logs, 5,000 mood logs, 5,000 sleep logs, 20,000 water logs, 2,000 journals, and 30 subtasks per task. Operators can override these values with the documented `MAX_*` environment variables.

## Calendar, Recommendations, And Search

- `GET|POST /api/calendar`
- `PUT|DELETE /api/calendar/:id`
- `GET /api/recommendations`
- `POST /api/recommendations/:id/feedback`
- `GET /api/search?q=keyword`

Recommendation feedback is idempotent. Active recommendations are bounded and regenerated with cooldowns to avoid duplicate or rapidly changing advice.

## Companion And Learning

- `GET /api/companion/status`
- `GET /api/companion/context`
- `GET /api/companion/history`
- `POST /api/companion/chat`
- `GET /api/neural/status`
- `GET /api/neural/training-manifest?limit=500`
- `GET /api/profile`
- `PUT /api/profile`
- `DELETE /api/profile`

Personal context, interaction history, recommendations, and learning data are exposed only when the user's AI personalization and privacy settings permit them. Privacy mode immediately deactivates cached personalized recommendations and pauses the local learning engine.
