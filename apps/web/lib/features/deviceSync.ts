import {
  syncStatusSchema,
  type SyncConflictStrategy,
  type SyncPairStartResponse,
  type SyncStatus
} from "../contracts/planned";

/**
 * Encrypted device sync — mock adapter.
 *
 * No endpoint exists. When one does, replace the body of each function below
 * with the corresponding `apiRequest` call and delete `MOCK_STATUS`; the
 * component consuming this does not change. The backend work is specified in
 * `docs/planned-backend-work.md`.
 *
 * No cryptography is implemented here, deliberately. The fingerprints below are
 * fixed strings, not derived keys, and the UI says so.
 */

const MOCK_STATUS: SyncStatus = {
  enabled: false,
  devices: [
    {
      id: "cmsyncdevice000000000000a",
      name: "This browser",
      kind: "WEB",
      state: "ACTIVE",
      keyFingerprint: "a3f1c2b4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80",
      lastSeenAt: null,
      createdAt: "2026-08-01T09:00:00.000Z"
    }
  ],
  lastSyncedAt: null,
  pendingChanges: 0,
  conflicts: []
};

export type DeviceSyncAdapter = {
  connected: boolean;
  getStatus: () => Promise<SyncStatus>;
  startPairing: () => Promise<SyncPairStartResponse>;
  resolveConflict: (conflictId: string, strategy: SyncConflictStrategy) => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
};

function notConnected(): never {
  throw new Error("Device sync has no backend yet. This surface is a preview of the intended contract.");
}

export const deviceSync: DeviceSyncAdapter = {
  connected: false,

  async getStatus() {
    // Parsed through the contract so the mock cannot drift from the schema the
    // real endpoint will have to satisfy.
    return syncStatusSchema.parse(MOCK_STATUS);
  },

  async startPairing() {
    return notConnected();
  },

  async resolveConflict() {
    return notConnected();
  },

  async revokeDevice() {
    return notConnected();
  }
};
