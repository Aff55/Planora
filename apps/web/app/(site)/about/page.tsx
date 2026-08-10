import type { Metadata } from "next";
import { Group, Panel } from "../../../components/ui/surfaces";
import { HONEST_LIMITS } from "../../../lib/site-content";

export const metadata: Metadata = {
  title: "About",
  description: "What Planora is, what it deliberately is not, and what is still unfinished.",
  alternates: { canonical: "/about" }
};

const stack = [
  { layer: "Web", detail: "Next.js App Router, React, TypeScript" },
  { layer: "Mobile", detail: "Expo and React Native — a real native client, not a web view" },
  { layer: "API", detail: "Express with Prisma, validated by schemas shared with both clients" },
  { layer: "Data", detail: "PostgreSQL, with Redis for readiness checks" },
  { layer: "Model", detail: "Ollama, served locally" }
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
      <p className="mb-4 text-micro font-bold uppercase text-accent-text">About</p>
      <h1 className="max-w-3xl text-title-1">A planner that accumulates without watching you</h1>

      <div className="mt-8 max-w-prose space-y-5 text-body leading-relaxed text-muted">
        <p>
          Planora started as a study planner and grew out of it. The narrower idea — a tool for one kind of person doing
          one kind of work — kept running into the fact that a day is not divided that way. Now it is for anyone keeping
          track of an ordinary life: students, people in work, self-employed, caregivers, retired, between roles.
        </p>
        <p>
          The design rule that shaped everything else is that a day never resets. Midnight moves the view forward in
          your own timezone; it does not clear anything. What you did last month is still there, which is what makes a
          pattern possible in the first place.
        </p>
        <p>
          The second rule is that adaptation must not require surveillance. That constraint is why the learning is small
          and legible rather than a model quietly training on your journal, and why every conclusion arrives with the
          numbers behind it.
        </p>
      </div>

      <section className="mt-14">
        <h2 className="text-title-2">How it is built</h2>
        <div className="mt-6">
          <Group>
            <ul className="divide-hairline">
              {stack.map((item) => (
                <li key={item.layer} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                  <span className="w-20 shrink-0 text-micro font-bold uppercase text-muted">{item.layer}</span>
                  <span className="min-w-0 flex-1 text-callout text-ink">{item.detail}</span>
                </li>
              ))}
            </ul>
          </Group>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-title-2">What is not finished</h2>
        <p className="mt-3 max-w-prose text-body text-muted">
          Stated here rather than omitted, because a page that only lists strengths is not worth reading.
        </p>
        <div className="mt-6">
          <Group>
            <ul className="divide-hairline">
              {HONEST_LIMITS.map((limit) => (
                <li key={limit} className="px-5 py-4 text-callout leading-relaxed">
                  {limit}
                </li>
              ))}
            </ul>
          </Group>
        </div>
      </section>

      <Panel className="mt-10">
        <h2 className="text-title-3">On the fine-tuned model</h2>
        <p className="mt-3 text-callout leading-relaxed text-muted">
          A custom model was trained, converted, quantised and registered locally. It scored better than its base on
          most evaluation prompts — and then failed on uncertainty and on a chest-pain question, and invented precise
          schedules it had no basis for. It was not promoted. The app runs the general model instead, and the candidate
          sits behind a version tag until it clears a higher bar.
        </p>
      </Panel>
    </div>
  );
}
