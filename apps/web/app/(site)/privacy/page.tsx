import type { Metadata } from "next";
import { Group, Panel, surface } from "../../../components/ui/surfaces";
import { CONSENT_CONTROLS } from "../../../lib/site-content";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Planora stores, where it stores it, what each consent switch turns off, and how to export or delete everything.",
  alternates: { canonical: "/privacy" }
};

const stored = [
  { what: "Account", detail: "Email, name, a bcrypt password hash, and your timezone." },
  { what: "Planning", detail: "Tasks, subtasks and calendar events." },
  { what: "Life and wellbeing", detail: "Activities, mood, sleep, hydration and journal entries." },
  { what: "Adaptation", detail: "Inferred habits, generated suggestions, and your accept/dismiss feedback." },
  {
    what: "AI",
    detail:
      "Companion conversations, a local retrieval index built from your own text, and structured events describing what you did in the app — all three only while personalization is on and private mode is off."
  }
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
      <p className="mb-4 text-micro font-bold uppercase text-accent-text">Privacy</p>
      <h1 className="max-w-3xl text-title-1">There is no server to send it to</h1>
      <p className="mt-5 max-w-prose text-body leading-relaxed text-muted">
        Planora runs on your machine: a PostgreSQL database, an API, and optionally a language model, all on localhost.
        This is not a hosted service with a privacy-friendly policy. It is software with nowhere to upload anything.
      </p>

      <section className="mt-14">
        <h2 className="text-title-2">What is stored</h2>
        <p className="mt-3 max-w-prose text-body text-muted">All of it in your own database, scoped to your account.</p>
        <div className="mt-6">
          <Group>
            <ul className="divide-hairline">
              {stored.map((item) => (
                <li key={item.what} className="px-5 py-4">
                  <p className="text-callout font-semibold text-ink">{item.what}</p>
                  <p className="mt-1 text-callout leading-relaxed text-muted">{item.detail}</p>
                </li>
              ))}
            </ul>
          </Group>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-title-2">Every switch, and what it turns off</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {CONSENT_CONTROLS.map((control) => (
            <div key={control.name} className={`rounded-lg p-6 ${surface}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-title-3">{control.name}</h3>
                <span className="text-footnote text-muted">
                  {control.where} · default {control.defaultState.toLowerCase()}
                </span>
              </div>
              <p className="mt-3 text-callout leading-relaxed text-muted">{control.turnsOff}</p>
              <p className="mt-3 font-evidence text-micro text-evidence-key">{control.code}</p>
            </div>
          ))}
        </div>
        <Panel className="mt-6">
          <p className="text-callout leading-relaxed text-muted">
            Every switch listed above changes what the app does. There used to be a fourth — an analytics preference
            that was stored, shown, and read by nothing. A control that does nothing is exactly the sort of thing that
            quietly becomes something later, so it was removed rather than left to accumulate a meaning nobody agreed
            to. No analytics service is connected to this build, and no code path sends usage data anywhere.
          </p>
        </Panel>
      </section>

      <section className="mt-14">
        <h2 className="text-title-2">Getting your data out, and getting rid of it</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className={`rounded-lg p-6 ${surface}`}>
            <h3 className="text-title-3">Export</h3>
            <p className="mt-2 text-callout leading-relaxed text-muted">
              One file, JSON or CSV, containing your account, settings, profile, tasks, events, activities, wellbeing
              logs, journal, suggestions and habits.
            </p>
          </div>
          <div className={`rounded-lg p-6 ${surface}`}>
            <h3 className="text-title-3">Clear AI memory</h3>
            <p className="mt-2 text-callout leading-relaxed text-muted">
              Deletes conversations, the retrieval index and learning events. Your tasks, calendar and wellbeing records
              are untouched.
            </p>
          </div>
          <div className={`rounded-lg p-6 ${surface}`}>
            <h3 className="text-title-3">Delete the account</h3>
            <p className="mt-2 text-callout leading-relaxed text-muted">
              Requires your exact email and current password. Everything owned by the account is removed by database
              cascade, not marked hidden.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-title-2">What this page is not</h2>
        <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
          It is not a legal privacy policy, and Planora is not a medical device. The app does not diagnose conditions,
          prescribe treatment, or replace a qualified professional — and where a conversation heads that way, the
          companion says so and stops rather than improvising.
        </p>
      </section>
    </div>
  );
}
