"use client";

import { useEffect, useState } from "react";
import { Laptop, RefreshCw, Smartphone } from "lucide-react";
import { Group, Section } from "../ui/surfaces";
import { Button } from "../ui/controls";
import { PreviewBadge } from "./PreviewBadge";
import { deviceSync } from "../../lib/features/deviceSync";
import { PREVIEW_FEATURES } from "../../lib/features/flags";
import type { SyncStatus } from "../../lib/contracts/planned";

/**
 * Encrypted device sync — the settings surface for a feature with no backend.
 *
 * Everything below is driven by the mock adapter and labelled as unconnected.
 * No cryptography is implemented: the fingerprint shown is a fixed string, and
 * the panel says so rather than implying a key exists.
 */
export function DeviceSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!PREVIEW_FEATURES) return;
    let cancelled = false;
    deviceSync
      .getStatus()
      .then((next) => !cancelled && setStatus(next))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!PREVIEW_FEATURES) return null;

  async function attemptPairing() {
    try {
      await deviceSync.startPairing();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Not connected.");
    }
  }

  return (
    <Section title="Device sync">
      <div className="space-y-3">
        <PreviewBadge>
          The interface and the request/response contract are designed, but no endpoint exists and no key material is
          generated. Nothing here syncs anything. The backend work is specified in docs/planned-backend-work.md.
        </PreviewBadge>

        <Group>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-callout font-medium">Status</p>
              <p className="mt-1 text-footnote text-muted">
                {status?.enabled ? "Enabled" : "Not enabled"} · {status?.pendingChanges ?? 0} pending change
                {(status?.pendingChanges ?? 0) === 1 ? "" : "s"} · {status?.conflicts.length ?? 0} conflict
                {(status?.conflicts.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="secondary" onClick={() => void attemptPairing()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Pair a device
            </Button>
          </div>

          {(status?.devices ?? []).map((device) => (
            <div key={device.id} className="flex items-start gap-4 px-5 py-4">
              {device.kind === "WEB" || device.kind === "DESKTOP" ? (
                <Laptop className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
              ) : (
                <Smartphone className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-callout font-medium">{device.name}</p>
                <p className="mt-1 text-footnote text-muted">
                  {device.kind.toLowerCase()} · {device.state.toLowerCase()}
                </p>
                <p className="mt-2 break-all font-evidence text-micro text-evidence-key">
                  {device.keyFingerprint.slice(0, 32)}…
                </p>
              </div>
            </div>
          ))}
        </Group>

        {message && (
          <p role="status" className="px-1 text-footnote text-muted">
            {message}
          </p>
        )}
      </div>
    </Section>
  );
}
