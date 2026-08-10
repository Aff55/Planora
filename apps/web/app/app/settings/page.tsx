"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Brain, Download, Eraser, LogOut, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { exportFormats, themePreferences } from "@planora/shared";
import { PageHeader } from "../../../components/app/PageHeader";
import { DeviceSyncPanel } from "../../../components/app/DeviceSyncPanel";
import { Group, Section } from "../../../components/ui/surfaces";
import { Button, Field, Select, Toggle, inputClass } from "../../../components/ui/controls";
import { apiDownload, apiRequest } from "../../../lib/api";
import { label as toLabel } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useSession } from "../../../lib/session";
import { useTheme } from "../../../lib/theme";
import type { AccountSettings, ExportFormat, ThemePreference } from "../../../lib/types";

const commonZones = [
  "UTC",
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney"
];

export default function SettingsPage() {
  const router = useRouter();
  const { guard, notify } = useMessages();
  const { user, settings, refresh, applySettings, signOut, signOutEverywhere } = useSession();
  const { setPreference } = useTheme();

  const [account, setAccount] = useState({ name: user?.name ?? "", timezone: user?.timezone ?? "UTC" });
  const [draft, setDraft] = useState<AccountSettings>(settings);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setAccount({ name: user.name, timezone: user.timezone });
  }, [user]);

  useEffect(() => setDraft(settings), [settings]);

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    await guard(async () => {
      await apiRequest("/auth/profile", { method: "PUT", body: account });
      await refresh();
    }, "Account updated.");
  }

  /** Settings write immediately — a toggle that needs a save button is a trap. */
  async function persist(next: AccountSettings, successMessage: string) {
    setDraft(next);
    applySettings(next);
    setPreference(next.theme, { persistLocally: true });
    await guard(async () => {
      await apiRequest("/auth/settings", { method: "PUT", body: next });
    }, successMessage);
  }

  async function exportData() {
    await guard(async () => {
      const { blob, filename } = await apiDownload("/auth/export");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "Export downloaded.");
  }

  async function clearAiData() {
    if (!window.confirm("Clear saved conversations, learned memory and learning events? Tasks and life logs stay.")) return;
    await guard(async () => {
      const cleared = await apiRequest<{ cleared: { interactions: number; memories: number; learningEvents: number } }>(
        "/auth/ai-data",
        { method: "DELETE" }
      );
      notify(
        `Cleared ${cleared.cleared.interactions} conversations, ${cleared.cleared.memories} memories and ${cleared.cleared.learningEvents} learning events.`
      );
    });
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    router.replace("/auth");
  }

  async function handleSignOutEverywhere() {
    if (!window.confirm("Sign out every active session, including mobile devices?")) return;
    setBusy(true);
    const ok = await guard(async () => {
      await signOutEverywhere();
    });
    setBusy(false);
    if (ok) router.replace("/auth");
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Permanently delete this account and everything in it? This cannot be undone.")) return;
    await guard(async () => {
      await apiRequest("/auth/account", {
        method: "DELETE",
        body: { emailConfirmation: deleteEmail, currentPassword: deletePassword }
      });
      window.location.assign("/");
    });
  }

  const canDelete = Boolean(user) && deleteEmail === user?.email && deletePassword.length >= 8;

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Identity, privacy, appearance, and your data." />

      <div className="max-w-3xl space-y-8">
        <Section title="Account">
          <Group>
            <form onSubmit={saveAccount} className="space-y-5 p-5">
              <Field label="Name">
                {({ id }) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={account.name}
                    onChange={(event) => setAccount({ ...account, name: event.target.value })}
                    required
                  />
                )}
              </Field>
              <Field label="Timezone" hint="Day boundaries, streaks and summaries are computed in this zone.">
                {({ id, describedBy }) => (
                  <>
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      className={inputClass}
                      list="planora-timezones"
                      value={account.timezone}
                      onChange={(event) => setAccount({ ...account, timezone: event.target.value })}
                      required
                    />
                    <datalist id="planora-timezones">
                      {commonZones.map((zone) => (
                        <option key={zone} value={zone} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Button type="submit">Save account</Button>
            </form>
          </Group>
        </Section>

        <Section title="Privacy">
          <Group>
            <Toggle
              icon={Brain}
              label="AI personalization"
              description="Off means the companion answers without reading your records, suggestions stop being generated, and the learning engine reports itself disabled."
              checked={draft.aiPersonalization}
              onChange={(value) => void persist({ ...draft, aiPersonalization: value }, "Privacy setting saved.")}
            />
            <Toggle
              icon={Shield}
              label="Private AI mode"
              description="On means journal entries, reflections, sleep notes and chat history are withheld from context, and no new learning records are written."
              checked={draft.privacyMode}
              onChange={(value) => void persist({ ...draft, privacyMode: value }, "Privacy setting saved.")}
            />
          </Group>
        </Section>

        <Section title="Appearance and export">
          <Group>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Theme">
                {({ id }) => (
                  <Select
                    id={id}
                    value={draft.theme}
                    onChange={(value) => void persist({ ...draft, theme: value as ThemePreference }, "Theme saved.")}
                    options={themePreferences.map((value) => ({ value, label: toLabel(value) }))}
                  />
                )}
              </Field>
              <Field label="Export format">
                {({ id }) => (
                  <Select
                    id={id}
                    value={draft.exportFormat}
                    onChange={(value) =>
                      void persist({ ...draft, exportFormat: value as ExportFormat }, "Export format saved.")
                    }
                    options={exportFormats.map((value) => ({ value, label: value }))}
                  />
                )}
              </Field>
            </div>
          </Group>
        </Section>

        <Section title="Your data">
          <Group>
            <div className="flex flex-wrap gap-3 p-5">
              <Button variant="secondary" onClick={() => void exportData()}>
                <Download className="size-4" aria-hidden="true" />
                Export everything
              </Button>
              <Button variant="secondary" onClick={() => void clearAiData()}>
                <Eraser className="size-4" aria-hidden="true" />
                Clear AI memory
              </Button>
            </div>
          </Group>
          <p className="mt-3 max-w-prose px-1 text-footnote leading-relaxed text-muted">
            The export follows the format above and contains everything this account owns. Clearing AI memory removes
            conversations, the retrieval index and learning events — your tasks, calendar and wellbeing records are not
            touched.
          </p>
        </Section>

        <DeviceSyncPanel />

        <Section title="Sessions">
          <Group>
            <div className="flex flex-wrap gap-3 p-5">
              <Button variant="secondary" disabled={busy} onClick={() => void handleSignOut()}>
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => void handleSignOutEverywhere()}>
                <ShieldCheck className="size-4" aria-hidden="true" />
                Sign out everywhere
              </Button>
            </div>
          </Group>
        </Section>

        <Section title="Danger zone">
          <div className="overflow-hidden rounded-lg border border-critical/40 bg-surface">
            <form onSubmit={deleteAccount} className="space-y-5 p-5">
              <div>
                <h3 className="text-title-3 text-critical">Delete account</h3>
                <p className="mt-2 max-w-prose text-callout leading-relaxed text-muted">
                  Removes everything this account owns by database cascade. Confirm with your exact email and current
                  password.
                </p>
              </div>
              <Field label="Email confirmation">
                {({ id }) => (
                  <input
                    id={id}
                    className={inputClass}
                    type="email"
                    autoComplete="off"
                    value={deleteEmail}
                    onChange={(event) => setDeleteEmail(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Current password">
                {({ id }) => (
                  <input
                    id={id}
                    className={inputClass}
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" variant="danger" disabled={!canDelete}>
                <Trash2 className="size-4" aria-hidden="true" />
                Delete account permanently
              </Button>
            </form>
          </div>
        </Section>
      </div>
    </>
  );
}
