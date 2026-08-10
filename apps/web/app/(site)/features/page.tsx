import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Group, surface } from "../../../components/ui/surfaces";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Tasks, calendar, life logging, wellbeing, a local AI companion and a pattern engine that shows its arithmetic.",
  alternates: { canonical: "/features" }
};

const groups = [
  {
    title: "Tasks",
    items: [
      "One-line capture; priority, category, due date and progress behind a disclosure",
      "Subtasks, and daily, weekly or monthly recurrence that creates the next occurrence exactly once",
      "Free-text search across titles, descriptions and notes, plus status and category filters",
      "Cursor pagination, so a list of two thousand behaves like a list of ten",
      "Completion is optimistic and reconciles with the server, rolling back visibly if it is refused"
    ]
  },
  {
    title: "Calendar",
    items: [
      "Month grid on wide screens, agenda on narrow ones",
      "Correct in your own IANA timezone, including across daylight-saving changes",
      "Events can be linked to a task",
      "Overlapping events are detected and surfaced as a signal, not silently ignored"
    ]
  },
  {
    title: "Life logging",
    items: [
      "One tap for the four things people actually repeat: food, movement, social contact, time outside",
      "A custom composer with category, duration, timestamp and a note",
      "Today and this-week histories, each entry deletable",
      "These logs are what the pattern engine and the habit engine read"
    ]
  },
  {
    title: "Wellbeing",
    items: [
      "Mood with separate stress and energy scales, plus an optional reflection",
      "Sleep duration and quality; hydration with quick amounts",
      "A journal, kept out of model context entirely when private mode is on",
      "Everything deletable, because a mistyped entry should not quietly skew your suggestions"
    ]
  },
  {
    title: "The companion",
    items: [
      "Runs on your machine through Ollama; falls back to built-in planning rules and says so",
      "Reads a bounded snapshot of your day, and only what your privacy settings allow",
      "Can create a task, event or life log from a plain sentence, through the ordinary service layer",
      "Will not claim it changed your data when it did not — responses that do are rejected before you see them",
      "Declines medical, unsafe and out-of-scope requests rather than improvising"
    ]
  },
  {
    title: "Insights",
    items: [
      "Five detectors: weekday rhythm, time of day, lapses, co-occurrence and week-over-week trend",
      "Every result carries an evidence object you can expand and check by hand",
      "Correlations are labelled as association, never as cause",
      "Checks that found nothing are listed with the reason they found nothing",
      "Suggestions you accept or dismiss re-weight the ranker, with cooldowns so nothing nags"
    ]
  },
  {
    title: "Your account",
    items: [
      "Export everything as JSON or CSV",
      "Clear AI chats, learned memory and learning events without touching your tasks or logs",
      "Sign out on this device, or revoke every session everywhere",
      "Delete the account, gated on your exact email and current password"
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
      <p className="mb-4 text-micro font-bold uppercase text-accent-text">Features</p>
      <h1 className="max-w-3xl text-title-1">Everything it does, stated plainly</h1>
      <p className="mt-5 max-w-prose text-body leading-relaxed text-muted">
        No feature below is aspirational. If something is planned rather than built, it is listed on the{" "}
        <Link href="/about" className="text-accent-text underline underline-offset-2">
          about page
        </Link>{" "}
        instead of here.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 px-1 text-micro font-bold uppercase text-muted">{group.title}</h2>
            <Group>
              <ul className="divide-hairline">
                {group.items.map((item) => (
                  <li key={item} className="px-5 py-4 text-callout leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </Group>
          </section>
        ))}
      </div>

      <div className={`mt-12 rounded-lg p-8 ${surface}`}>
        <h2 className="text-title-2">See it against real data</h2>
        <p className="mt-3 max-w-prose text-body text-muted">
          The project ships a seeded account with sixty days of history, so the pattern engine has something to find on
          the first run.
        </p>
        <Link
          href="/auth"
          className="focus-ring mt-6 inline-flex min-h-touch items-center gap-2 rounded-md bg-accent-strong px-5 text-callout font-semibold text-white transition hover:bg-accent-hover"
        >
          Get started
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
