import type { Metadata } from "next";
import { EvidenceBlock } from "../../../components/ui/evidence";
import { Confidence } from "../../../components/ui/feedback";
import { Group, Panel, surface } from "../../../components/ui/surfaces";
import { MODEL, PATTERN_ENGINE, SAMPLE_TREND } from "../../../lib/site-content";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Your records feed three small local engines: a pattern detector, a habit detector and a ranker. The AI runs on your own hardware.",
  alternates: { canonical: "/how-it-works" }
};

const detectors = [
  {
    kind: "weekday_rhythm",
    what: "Behaviour concentrating on particular weekdays.",
    how: "Compares the rate for each weekday against your overall rate, using opportunities rather than raw counts — a 60-day window does not contain the same number of every weekday."
  },
  {
    kind: "time_of_day",
    what: "Whether something reliably happens in the morning, afternoon, evening or night.",
    how: "Reported only when at least 60% of logs land in one bucket."
  },
  {
    kind: "lapse",
    what: "Something that used to be regular and has stopped.",
    how: "Compares the gap since the last occurrence against your own median gap, so it adapts to whether you log daily or twice a week."
  },
  {
    kind: "co_occurrence",
    what: "Two things that move together, optionally with a one-day lag.",
    how: `Pearson correlation, reported only with at least ${PATTERN_ENGINE.minPairedDays} paired days and |r| of at least ${PATTERN_ENGINE.minCorrelation}. Always worded as association.`
  },
  {
    kind: "trend",
    what: "A measure rising or falling week over week.",
    how: "Least-squares slope over weekly averages, gated on how well a straight line explains them and on the change being meaningful next to the typical value."
  }
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
      <p className="mb-4 text-micro font-bold uppercase text-accent-text">How it works</p>
      <h1 className="max-w-3xl text-title-1">Small engines, arithmetic you can check</h1>
      <p className="mt-5 max-w-prose text-body leading-relaxed text-muted">
        There is no large model learning about you in the background. There are three small, inspectable pieces that
        read the records you chose to keep, and a language model that only ever sees a bounded snapshot of them.
      </p>

      <section className="mt-14">
        <h2 className="text-title-2">1. The pattern engine</h2>
        <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
          Five detectors run over a {PATTERN_ENGINE.windowDays}-day window. Each result carries the numbers it was
          computed from. No learned weights, no embeddings — nothing you could not reproduce with a spreadsheet.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="border-b border-line px-4 py-3 text-micro font-bold uppercase text-muted">
                  Detector
                </th>
                <th scope="col" className="border-b border-line px-4 py-3 text-micro font-bold uppercase text-muted">
                  What it looks for
                </th>
                <th scope="col" className="border-b border-line px-4 py-3 text-micro font-bold uppercase text-muted">
                  How it decides
                </th>
              </tr>
            </thead>
            <tbody>
              {detectors.map((detector) => (
                <tr key={detector.kind}>
                  <td className="border-b border-hairline px-4 py-4 align-top">
                    <span className="font-evidence text-footnote text-accent-text">{detector.kind}</span>
                  </td>
                  <td className="border-b border-hairline px-4 py-4 align-top text-callout text-ink">{detector.what}</td>
                  <td className="border-b border-hairline px-4 py-4 align-top text-callout leading-relaxed text-muted">
                    {detector.how}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Group>
            <article className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-title-3">{SAMPLE_TREND.title}</h3>
                <Confidence value={SAMPLE_TREND.confidence} />
              </div>
              <p className="mt-3 text-callout leading-relaxed text-muted">{SAMPLE_TREND.detail}</p>
              <EvidenceBlock evidence={SAMPLE_TREND.evidence} className="mt-5" />
            </article>
          </Group>
          <Panel>
            <h3 className="text-title-3">Read the middle column</h3>
            <p className="mt-3 text-callout leading-relaxed text-muted">
              That is eight weekly averages, the fitted slope, and how well the line explains them. If you disagree with
              the conclusion you can disagree with a specific number, which is the entire point. A confidence figure
              with nothing behind it is just a claim wearing a percentage.
            </p>
            <p className="mt-4 text-footnote leading-relaxed text-muted">
              Example output from the seeded demo account included with the project.
            </p>
          </Panel>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-title-2">2. The habit engine</h2>
        <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
          Separately, six broad routines are inferred from the same window — movement, meal awareness, social contact,
          outdoor time, task follow-through and wellbeing check-ins. Each needs at least two occurrences before it is
          claimed at all, and carries a current streak, a longest streak and a confidence. A habit you created yourself
          is never overwritten by inference.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-title-2">3. The ranker</h2>
        <p className="mt-3 max-w-prose text-body leading-relaxed text-muted">
          Suggestions start as rules — overdue work, a dense calendar, low hydration, short sleep, a routine that has
          gone quiet. The ranker then orders them using your own feedback: accepting one raises that type&rsquo;s
          weight, dismissing lowers it, and recent feedback counts for more than old feedback. Cooldowns stop the same
          suggestion returning immediately.
        </p>
        <p className="mt-4 max-w-prose text-body leading-relaxed text-muted">
          It is called a ranker rather than a neural network because that is what it is. You can read its current
          weights on the Insights page.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-title-2">4. The companion</h2>
        <div className={`mt-6 rounded-lg p-6 ${surface}`}>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-micro font-bold uppercase text-muted">Model</dt>
              <dd className="mt-1 font-evidence text-callout text-ink">{MODEL.name}</dd>
            </div>
            <div>
              <dt className="text-micro font-bold uppercase text-muted">Built from</dt>
              <dd className="mt-1 font-evidence text-callout text-ink">{MODEL.base}</dd>
            </div>
            <div>
              <dt className="text-micro font-bold uppercase text-muted">Served by</dt>
              <dd className="mt-1 font-evidence text-callout text-ink">
                {MODEL.runtime} · {MODEL.endpoint}
              </dd>
            </div>
            <div>
              <dt className="text-micro font-bold uppercase text-muted">Context window</dt>
              <dd className="mt-1 font-evidence text-callout text-ink">{MODEL.contextTokens} tokens</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-micro font-bold uppercase text-muted">What it runs on</dt>
              <dd className="mt-1 text-callout text-ink">{MODEL.hardwareRequirement}</dd>
              <dd className="mt-1 text-footnote text-muted">{MODEL.hardwareNote}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-6 max-w-prose text-body leading-relaxed text-muted">
          Your snapshot is passed to the model as data explicitly marked untrusted, never as instructions — so a task
          title cannot talk the assistant into doing something. Replies are checked before you see them: anything that
          leaks the prompt, repeats the previous answer, or claims to have created something the service did not
          actually create is discarded, and the deterministic rules answer instead.
        </p>
        <p className="mt-4 max-w-prose text-body leading-relaxed text-muted">
          If the model is not running, the companion still works. It tells you it is answering from rules rather than
          pretending a model replied.
        </p>
      </section>
    </div>
  );
}
