import type { Metadata } from "next";
import Link from "next/link";
import { Group } from "../../../components/ui/surfaces";
import { MODEL } from "../../../lib/site-content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Straight answers about where Planora runs, what it needs, and what it will not do.",
  alternates: { canonical: "/faq" }
};

const faqs = [
  {
    q: "Do I need a GPU?",
    a: `Not to use Planora. Tasks, calendar, life logging, wellbeing, patterns and suggestions are all ordinary application code and run on anything. A GPU only matters for the language companion, which is optional — without it, the companion answers from built-in planning rules and tells you that is what it is doing.`
  },
  {
    q: "Which model does it use?",
    a: `${MODEL.name}, built from ${MODEL.base} and served by ${MODEL.runtime} on ${MODEL.endpoint}. ${MODEL.hardwareRequirement}. You can point it at a different model with an environment variable.`
  },
  {
    q: "Is anything sent anywhere?",
    a: "No. There is no analytics, no error reporting, no font CDN and no third-party embed, on this site or in the app. Both typefaces are the ones already installed on your operating system. The network tab is the honest way to check this, and it is meant to be checked."
  },
  {
    q: "Is there a hosted version I can just sign up for?",
    a: "No, and that is the point rather than a missing feature. Planora is software you run. There is no server holding other people's days."
  },
  {
    q: "What happens to my data at midnight?",
    a: "Nothing. The view moves to the next day in your own timezone and everything before it stays exactly where it was. That history is what makes streaks, trends and patterns possible."
  },
  {
    q: "Can the companion change my data?",
    a: "It can create a task, a calendar event or a life log when you clearly ask for one, and it does so through the same validated, quota-checked code path the buttons use. It cannot delete anything, and if a reply claims it created something the service did not actually create, that reply is discarded before you see it."
  },
  {
    q: "Will it give me medical or mental-health advice?",
    a: "No. It can track what you log and help you plan around it, but it will not diagnose, prescribe or choose a medication, and it says so plainly when a conversation goes there. For anything urgent it points at a professional or emergency services."
  },
  {
    q: "Why does a suggestion say “association, not cause”?",
    a: "Because that is all sixty days of self-reported logs can support. Two things moving together is worth noticing and worth acting on; it is not evidence that one caused the other, and writing it as though it were would be the easiest way to make the product feel smarter and be wronger."
  },
  {
    q: "What if I turn everything off?",
    a: "It keeps working. Tasks, calendar, life logs and wellbeing are unaffected — you lose personalized suggestions and the companion's awareness of your records, which is the trade you chose."
  },
  {
    q: "Can I get my data out?",
    a: "One click, JSON or CSV, containing everything the account owns. You can also clear only the AI-derived data, or delete the account entirely with your email and password."
  }
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-app px-5 py-16 sm:px-8">
      <p className="mb-4 text-micro font-bold uppercase text-accent-text">FAQ</p>
      <h1 className="max-w-3xl text-title-1">Straight answers</h1>

      <div className="mt-10 max-w-3xl">
        <Group>
          <div className="divide-hairline">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-5 py-4">
                <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-callout font-semibold text-ink">
                  {faq.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-muted transition-transform duration-state group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-prose text-callout leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </Group>
      </div>

      <p className="mt-10 max-w-prose text-body text-muted">
        Still unclear?{" "}
        <Link href="/how-it-works" className="text-accent-text underline underline-offset-2">
          How it works
        </Link>{" "}
        goes through the engines in detail, and{" "}
        <Link href="/privacy" className="text-accent-text underline underline-offset-2">
          Privacy
        </Link>{" "}
        lists exactly what each switch turns off.
      </p>
    </div>
  );
}
