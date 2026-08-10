# Database Schema Explanation

Planora uses a normalized PostgreSQL schema through Prisma.

## Core Identity

- `User`: account, email, password hash, timezone.
- `Settings`: one-to-one user preferences for theme, notifications, privacy, AI personalization, and export format.

## Planning

- `Task`: user-owned task with priority, status, category, due date, progress, notes, color, recurring rule, and order.
- `Subtask`: ordered child checklist items for a task.
- `CalendarEvent`: user-owned calendar item, optionally linked to a task.
- `Goal`, `Habit`, `Achievement`, `Notification`: future-ready productivity and engagement records.

## Wellbeing

- `Activity`: general life log for food, movement, socializing, errands, rest, and other user behavior.
- `MoodLog`: mood, stress, energy, reflection.
- `SleepLog`: hours, quality, notes.
- `WaterLog`: amount and logged time.
- `JournalEntry`: title, body, optional mood.

## AI And Learning

- `AIInteraction`: stored prompt/response records with provider metadata.
- `EmbeddingMemory`: local/free embedding adapter storage for retrieval.
- `Recommendation`: rule-generated recommendation records.
- `RecommendationFeedback`: accepted, dismissed, or snoozed feedback.
- `ModelEvent`: structured training data for future neural ranking and prediction.
- `PersonalProfile`: optional user-provided routine, role, goal, interest, body, coaching-style, and consent fields.
- `Habit`: manual or inferred routine state with current/longest streak, occurrence count, and confidence.
