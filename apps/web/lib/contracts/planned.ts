import { z } from "zod";

/**
 * Contracts for endpoints that do not exist yet.
 *
 * Written in the same Zod style as `packages/shared` so that when the backend
 * catches up, these move there unchanged and the mock adapter is deleted.
 *
 * Nothing in this file is served by the API today. Every surface that consumes
 * it must render the "Preview — not yet connected" affordance, because a
 * fabricated record that looks real is precisely the failure this product
 * exists to avoid. See `docs/planned-backend-work.md`.
 */

/* -------------------------------------------------------------------------- */
/* Encrypted device sync                                                       */
/* -------------------------------------------------------------------------- */

export const syncDeviceKinds = ["WEB", "IOS", "ANDROID", "DESKTOP"] as const;
export const syncDeviceStates = ["ACTIVE", "PENDING", "REVOKED"] as const;
export const syncConflictStrategies = ["KEEP_LOCAL", "KEEP_REMOTE", "KEEP_BOTH"] as const;

export const syncDeviceSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(syncDeviceKinds),
  state: z.enum(syncDeviceStates),
  /** SHA-256 of the device's public key, hex, for out-of-band comparison. */
  keyFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});

export const syncStatusSchema = z.object({
  enabled: z.boolean(),
  devices: z.array(syncDeviceSchema).max(25),
  lastSyncedAt: z.string().datetime().nullable(),
  pendingChanges: z.number().int().min(0),
  conflicts: z.array(
    z.object({
      id: z.string().cuid(),
      entity: z.enum(["Task", "CalendarEvent", "Activity", "JournalEntry"]),
      entityId: z.string().cuid(),
      localUpdatedAt: z.string().datetime(),
      remoteUpdatedAt: z.string().datetime(),
      remoteDeviceId: z.string().cuid(),
      summary: z.string().max(280)
    })
  )
});

/** POST /sync/pair — begins pairing; the code is shown on the existing device. */
export const syncPairStartResponseSchema = z.object({
  pairingCode: z.string().regex(/^[A-Z0-9]{6}$/),
  expiresAt: z.string().datetime(),
  /** Fingerprint the new device must display for the user to compare. */
  keyFingerprint: z.string().regex(/^[a-f0-9]{64}$/)
});

export const syncPairConfirmSchema = z.object({
  pairingCode: z.string().regex(/^[A-Z0-9]{6}$/),
  deviceName: z.string().trim().min(1).max(80),
  kind: z.enum(syncDeviceKinds)
});

export const syncConflictResolveSchema = z.object({
  conflictId: z.string().cuid(),
  strategy: z.enum(syncConflictStrategies)
});

export const syncDeviceRevokeSchema = z.object({
  deviceId: z.string().cuid()
});

export type SyncDevice = z.infer<typeof syncDeviceSchema>;
export type SyncStatus = z.infer<typeof syncStatusSchema>;
export type SyncPairStartResponse = z.infer<typeof syncPairStartResponseSchema>;
export type SyncConflictStrategy = (typeof syncConflictStrategies)[number];
