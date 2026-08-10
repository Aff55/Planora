import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Cpu,
  HeartPulse,
  ListChecks,
  Lock,
  MessageCircle,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { EvidenceBlock } from "../../components/ui/evidence";
import { Confidence } from "../../components/ui/feedback";
import { Group, Panel, surface } from "../../components/ui/surfaces";
import { CONSENT_CONTROLS, MODEL, PATTERN_ENGINE, SAMPLE_INCONCLUSIVE, SAMPLE_PATTERN } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "A private life planner that adapts without profiling you",
  description:
    "Planora plans your day, learns from the records you choose to keep, and shows its working. The AI runs on your own machine. Nothing is uploaded.",
  alternates: { canonical: "/" }
};

const surfaces = [
  { icon: ListChecks, title: "Tasks", body: "Priorities, due dates, subtasks and recurrence. Capture is one line." },
  { icon: CalendarDays, title: "Calendar", body: "A month grid and an agenda, correct in your own timezone." },
  { icon: Activity, title: "Life", body: "Meals, movement, people, time outside. One tap for the ordinary things." },
  { icon: HeartPulse, title: "Wellbeing", body: "Mood with stress and energy, sleep, hydration and a journal." },
  { icon: MessageCircle, title: "Companion", body: "A scoped planning assistant that runs on your machine." },
  { icon: TrendingUp, title: "Insights", body: "Patterns in your own logs, each one shown with its arithmetic." }
];

export default function HomePage() {
  return (
    <>
      {/* Hero. Deliberately compact — the proof sits directly underneath it
          rather than a screen of empty space. */}
      <section className="mx-auto max-w-app px-5 pb-12 pt-16 sm:px-8 sm:pt-20">
        <p className="mb-4 text-micro font-bold uppercase text-accent-text">Local-first life planning</p>
        <h1 className="max-w-3xl text-display">Adapts to you. Without profiling you.</h1>
        <p className="mt-6 max-w-prose text-body leading-relaxed text-muted">
          Planora keeps your tasks, calendar, routines and wellbeing in one place, notices what actually repeats, and
          suggests a next step. The database is on your machine. The model is on your machine. There is no account on a
          server somewhere, because there is no server.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/auth"
            className="focus-ring inline-flex min-h-touch items-center gap-2 rounded-md bg-accent-strong px-5 text-callout font-semibold text-white transition hover:bg-accent-hover active:scale-[0.97]"
          >
            Get started
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/how-it-works"
            className={`focus-ring inline-flex min-h-touch items-center gap-2 rounded-md px-5 text-callout font-semibold ${surface} transition hover:bg-sunken`}
          >
            How it works
          </Link>
        </div>
      </section>

      {/* The proof. "We show our working" is only worth saying if the working
          is on the page. */}
      <section className="border-y border-line bg-sunken/40">
        <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
          <h2 className="text-title-2">This is what &ldquo;shows its working&rdquo; means</h2>
          <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
            Most software tells you it found something. Planora tells you what it compared, over how many days, and how
            strongly — and refuses to call an association a cause. Here is a real result from the pattern engine, with
            the evidence object it carries, unedited.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Group>
              <article className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-title-3">{SAMPLE_PATTERN.title}</h3>
                  <Confidence value={SAMPLE_PATTERN.confidence} />
                </div>
                <p className="mt-3 text-callout leading-relaxed text-muted">{SAMPLE_PATTERN.detail}</p>
                <EvidenceBlock evidence={SAMPLE_PATTERN.evidence} className="mt-5" />
              </article>
            </Group>

            <div className="space-y-6">
              <Panel>
                <h3 className="text-title-3">It also tells you what it could not find</h3>
                <p className="mt-2 text-callout leading-relaxed text-muted">
                  Every check that ran and came back empty is reported with the reason, so silence is explainable
                  instead of looking like nothing happened.
                </p>
                <ul className="mt-4 space-y-2">
                  {SAMPLE_INCONCLUSIVE.map((item) => (
                    <li key={item.key} className="rounded-md border border-hairline bg-evidence-bg px-3 py-2">
                      <p className="font-evidence text-micro uppercase text-evidence-key">{item.key}</p>
                      <p className="mt-1 font-evidence text-footnote text-ink">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </Panel>

              <p className="text-footnote leading-relaxed text-muted">
                Computed over a {PATTERN_ENGINE.windowDays}-day window. A correlation is only reported at all with at
                least {PATTERN_ENGINE.minPairedDays} paired days and an absolute Pearson r of at least{" "}
                {PATTERN_ENGINE.minCorrelation}.{" "}
                <strong className="font-semibold text-ink">
                  The figures above come from the seeded demo account that ships with the project
                </strong>
                , not from a real person — it exists so the engine can be checked against known answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What it actually does. */}
      <section className="mx-auto max-w-app px-5 py-16 sm:px-8">
        <h2 className="text-title-2">One place for the day</h2>
        <p className="mt-3 max-w-prose text-body text-muted">
          Six surfaces, each doing one job. Nothing here requires you to fill in a form before it becomes useful.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surfaces.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`rounded-lg p-6 ${surface}`}>
                <Icon className="size-6 text-accent-text" aria-hidden="true" />
                <h3 className="mt-4 text-title-3">{item.title}</h3>
                <p className="mt-2 text-callout leading-relaxed text-muted">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Where the data goes. Only verifiable facts about Planora itself. */}
      <section className="border-y border-line bg-sunken/40">
        <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
          <h2 className="text-title-2">Where your data goes</h2>
          <p className="mt-3 max-w-prose text-body text-muted">
            The short version: nowhere. The longer version is checkable, so here it is.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className={`rounded-lg p-6 ${surface}`}>
              <Lock className="size-6 text-accent-text" aria-hidden="true" />
              <h3 className="mt-4 text-title-3">Your records</h3>
              <p className="mt-2 text-callout leading-relaxed text-muted">
                Stored in a PostgreSQL database running on your machine. Every row is scoped to your account, and
                deleting the account removes them.
              </p>
            </div>
            <div className={`rounded-lg p-6 ${surface}`}>
              <Cpu className="size-6 text-accent-text" aria-hidden="true" />
              <h3 className="mt-4 text-title-3">The model</h3>
              <p className="mt-2 text-callout leading-relaxed text-muted">
                <span className="font-evidence text-footnote">{MODEL.name}</span>, built from{" "}
                <span className="font-evidence text-footnote">{MODEL.base}</span>, served by {MODEL.runtime} on{" "}
                <span className="font-evidence text-footnote">{MODEL.endpoint}</span>. If it is not running, the
                companion answers from built-in rules and says so.
              </p>
            </div>
            <div className={`rounded-lg p-6 ${surface}`}>
              <ShieldCheck className="size-6 text-accent-text" aria-hidden="true" />
              <h3 className="mt-4 text-title-3">This website</h3>
              <p className="mt-2 text-callout leading-relaxed text-muted">
                No analytics, no font CDN, no error reporting, no embeds. Both typefaces are the ones already on your
                operating system. Open the network tab and check.
              </p>
            </div>
          </div>

          <p className="mt-8 max-w-prose text-footnote leading-relaxed text-muted">
            A cloud-hosted planner processes your data on its provider&rsquo;s servers — that is what hosting means, and
            it is not a criticism of any particular product. The difference worth stating plainly is architectural:
            Planora has nowhere to send your records, because it has no backend that you do not run yourself.
          </p>
        </div>
      </section>

      {/* Consent. Named controls, and what each actually switches off. */}
      <section className="mx-auto max-w-app px-5 py-16 sm:px-8">
        <h2 className="text-title-2">The switches, and what they really do</h2>
        <p className="mt-3 max-w-prose text-body text-muted">
          Five independent controls, all off by default except AI personalization. Each description below is what the
          code actually does when you turn it off.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="border-b border-line px-4 py-3 text-micro font-bold uppercase text-muted">
                  Control
                </th>
                <th scope="col" className="border-b border-line px-4 py-3 text-micro font-bold uppercase text-muted">
                  Default
                </th>
                <th scope="col" className="border-b border-line px-4 py-3 text-micro font-bold uppercase text-muted">
                  Turning it off means
                </th>
              </tr>
            </thead>
            <tbody>
              {CONSENT_CONTROLS.map((control) => (
                <tr key={control.name}>
                  <td className="border-b border-hairline px-4 py-4 align-top">
                    <span className="block text-callout font-semibold text-ink">{control.name}</span>
                    <span className="mt-1 block text-footnote text-muted">{control.where}</span>
                  </td>
                  <td className="border-b border-hairline px-4 py-4 align-top text-callout text-muted">
                    {control.defaultState}
                  </td>
                  <td className="border-b border-hairline px-4 py-4 align-top text-callout leading-relaxed text-muted">
                    {control.turnsOff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
          <div className={`rounded-lg p-8 ${surface}`}>
            <h2 className="text-title-2">Start with one ordinary day</h2>
            <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
              Planora gets useful once it has seen a few normal days — not perfect ones. Log a meal, a walk, and the
              thing you keep forgetting, and let it work from there.
            </p>
            <Link
              href="/auth"
              className="focus-ring mt-6 inline-flex min-h-touch items-center gap-2 rounded-md bg-accent-strong px-5 text-callout font-semibold text-white transition hover:bg-accent-hover active:scale-[0.97]"
            >
              Create an account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
