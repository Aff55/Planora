# Planned backend work

Backend work required by frontend surfaces that are built but not connected.

Only one feature in the Tier 2 set needs new endpoints. The rest were built
against endpoints that already exist and are fully live:

| Tier 2 feature | Status | Built on |
|---|---|---|
| Command palette | **Live** | `GET /search`, client-side navigation |
| Week and day calendar views | **Live** | `GET /calendar?month=` |
| Drag to reschedule an event | **Live** | `PUT /calendar/:id` |
| Drag to reorder tasks | **Live** | `POST /tasks/reorder` |
| Calendar import (`.ics`) | **Live** | parsed in-browser, created via `POST /calendar` |
| Voice capture | **Live** | browser SpeechRecognition, created via `POST /activities` |
| Insight report, exportable to PDF | **Live** | `GET /dashboard`, `/wellbeing/summary`, `/ranker/*`, browser print |
| Focus mode | **Live** | `GET /dashboard`, `PATCH /tasks/:id/complete` |
| Data explorer | **Live** | existing list endpoints plus `GET /auth/export` |
| **Encrypted device sync** | **Not connected** | — see below |

---

## Encrypted device sync

**Frontend:** `apps/web/components/app/DeviceSyncPanel.tsx`
**Contract:** `apps/web/lib/contracts/planned.ts`
**Mock adapter:** `apps/web/lib/features/deviceSync.ts`
**Feature flag:** `NEXT_PUBLIC_PLANORA_PREVIEW` (`apps/web/lib/features/flags.ts`)

The settings surface renders device list, pairing entry point, sync status and
conflict display, driven entirely by the mock adapter and marked
"Preview — not yet connected". No cryptography is implemented on the client and
none should be inferred from the UI: the fingerprint shown is a fixed string.

To connect it, implement the five endpoints below and replace each function
body in `deviceSync.ts` with the matching `apiRequest` call. No component
changes are needed.

### Data model

Two new models, both cascading from `User`:

```prisma
model SyncDevice {
  id             String    @id @default(cuid())
  userId         String
  name           String
  kind           SyncDeviceKind
  state          SyncDeviceState @default(PENDING)
  /// SHA-256 of the device's public key, lowercase hex, 64 chars.
  keyFingerprint String
  /// Device public key. The server never receives a private key.
  publicKey      String
  lastSeenAt     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, keyFingerprint])
  @@index([userId, state])
}

model SyncConflict {
  id             String   @id @default(cuid())
  userId         String
  entity         String   // "Task" | "CalendarEvent" | "Activity" | "JournalEntry"
  entityId       String
  localUpdatedAt DateTime
  remoteUpdatedAt DateTime
  remoteDeviceId String
  summary        String
  resolvedAt     DateTime?
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, resolvedAt])
}

enum SyncDeviceKind  { WEB IOS ANDROID DESKTOP }
enum SyncDeviceState { ACTIVE PENDING REVOKED }
```

A pairing code is short-lived and should not be a model field on `SyncDevice`;
store it in Redis under `sync:pair:<code>` with a TTL matching `expiresAt`.

### Endpoints

All require `requireAuth` and are scoped to the authenticated user.

#### `GET /api/sync/status`

Returns `syncStatusSchema`. Devices ordered by `lastSeenAt` descending, nulls
last. `pendingChanges` is the count of rows updated since the requesting
device's `lastSeenAt`. Cap `devices` at 25 and `conflicts` at 50.

#### `POST /api/sync/pair`

Returns `syncPairStartResponseSchema`. Generates a 6-character code from
`[A-Z0-9]`, stores it in Redis with a **10 minute** TTL against the requesting
user id, and returns the calling device's own fingerprint so the user can
compare it out of band on the second device.

Rate limit hard — 5 per 15 minutes per account. A pairing code is a
credential.

#### `POST /api/sync/pair/confirm`

Body: `syncPairConfirmSchema` plus the new device's `publicKey`. Validates the
code against Redis, creates the `SyncDevice` as `ACTIVE`, deletes the code, and
returns the device. Reject with `410` if the code has expired, `409` if the
fingerprint is already registered for that user.

Enforce a per-user device quota through `resourceLimits`, consistent with the
other `MAX_*` limits.

#### `POST /api/sync/conflicts/resolve`

Body: `syncConflictResolveSchema`. `KEEP_LOCAL` and `KEEP_REMOTE` apply the
chosen version and mark `resolvedAt`. `KEEP_BOTH` duplicates the entity and
resolves. Must run in a serializable transaction — this is the one place two
devices can race.

#### `POST /api/sync/devices/revoke`

Body: `syncDeviceRevokeSchema`. Sets `state = REVOKED`. Revoking a device must
also revoke its `AuthSession` rows, otherwise revocation is cosmetic.

### Encryption, explicitly out of scope for the frontend

The client currently generates no keys and encrypts nothing. Whoever implements
this must decide and document:

1. Where the key is derived from. Deriving from the account password means a
   password change re-keys every device.
2. What is encrypted. End-to-end encryption is only meaningful if the server
   stores ciphertext — but the API's own recommendation, pattern and habit
   engines read these rows in plaintext. **These two goals are in direct
   conflict and the tension must be resolved before implementation**, not
   during. The likely resolution is that sync transports ciphertext between
   devices while the local database stays plaintext, so the adaptive engines
   keep working.
3. How key rotation and device revocation interact with already-synced rows.

Until (2) is settled, the surface should stay behind the preview flag.

---

## Defects found in the existing backend, not fixed

Reported rather than changed, per the task constraints.

1. **Stored action URLs assume the app is at the site root.** `dashboard.ts`
   emits `quickActions` with `href` values `/tasks`, `/wellbeing`, `/life`,
   `/calendar`, and `recommendations.ts` emits `actionUrl` values including
   `/`. The web app now serves its authenticated routes under `/app/*`, so the
   client rewrites these on render. If the API ever serves another client with
   a different route layout, these should become route identifiers rather than
   paths.

2. **`GET /api/calendar` ignores `month` unless a cursor is absent — verify
   before relying on it.** Not observed failing, but the month filter and the
   cursor are applied to the same `where`, and paginating within a filtered
   month is untested by the current suite.

Neither blocks the frontend.
