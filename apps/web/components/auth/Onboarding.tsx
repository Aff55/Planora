"use client";

import clsx from "clsx";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Brain, Check, Loader2, Sparkles } from "lucide-react";
import { activityLevels, improvementStyles, lifeStages } from "@planora/shared";
import { Logo } from "../brand/Logo";
import { Button, Field, Toggle, inputClass } from "../ui/controls";
import { Group, Section, surface } from "../ui/surfaces";
import { Banner } from "../ui/feedback";
import { apiRequest, toMessage } from "../../lib/api";
import { label as toLabel, parseList } from "../../lib/format";
import { defaultSettings, useSession } from "../../lib/session";
import type { ActivityLevel, ImprovementStyle, LifeStage, PersonalProfile } from "../../lib/types";

/**
 * First-run setup.
 *
 * Every answer maps onto a field that already exists on `PersonalProfile` or
 * `Settings`, so this writes through `PUT /profile` and `PUT /auth/settings`
 * with no schema or API change. Skipping is always available and writes
 * nothing at all — which is the honest default for a product whose argument is
 * that it does not need your data to be useful.
 */

const goalSuggestions = [
  "Build a gym routine",
  "Sleep more consistently",
  "Protect my evenings",
  "Eat more balanced meals",
  "Stay in touch with people",
  "Stop tasks piling up",
  "Drink more water",
  "Get outside daily"
];

const steps = ["Welcome", "About you", "Goals", "Routine", "Coaching", "Privacy"] as const;

const emptyProfile: PersonalProfile = {
  lifeStage: null,
  profession: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  interests: [],
  primaryGoals: [],
  preferredWakeTime: null,
  preferredSleepTime: null,
  improvementStyle: "BALANCED",
  useForPersonalization: true,
  allowAnonymousTraining: false,
  allowProductAnalytics: false
};

export function Onboarding({ name, onDone }: { name: string; onDone: () => void }) {
  const { refresh } = useSession();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<PersonalProfile>(emptyProfile);
  const [goals, setGoals] = useState<string[]>([]);
  const [goalText, setGoalText] = useState("");
  const [interestText, setInterestText] = useState("");
  const [personalization, setPersonalization] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = name.trim().split(/\s+/)[0] || "there";
  const isLast = step === steps.length - 1;

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await apiRequest("/profile", {
        method: "PUT",
        body: {
          ...profile,
          primaryGoals: [...new Set([...goals, ...parseList(goalText, 8)])].slice(0, 8),
          interests: parseList(interestText, 12)
        }
      });
      await apiRequest("/auth/settings", {
        method: "PUT",
        body: { ...defaultSettings, aiPersonalization: personalization }
      });
      await refresh();
      onDone();
    } catch (cause) {
      setError(toMessage(cause));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-lg flex-col justify-center py-6">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Logo variant="mark" size="md" />
          <button
            type="button"
            onClick={onDone}
            className="focus-ring min-h-touch rounded-md px-2 text-footnote font-medium text-muted transition hover:text-ink"
          >
            Skip for now
          </button>
        </div>
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
        >
          {steps.map((label, index) => (
            <span
              key={label}
              className={clsx("h-1 flex-1 rounded-full transition-colors", index <= step ? "bg-accent" : "bg-sunken")}
            />
          ))}
        </div>
        <p className="mt-2 text-footnote text-muted">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>
      </div>

      <div key={step} className="enter-route space-y-6">
        {step === 0 && (
          <div className="text-center">
            <h1 className="text-title-1">Welcome, {firstName}</h1>
            <p className="mx-auto mt-3 max-w-sm text-callout leading-relaxed text-muted">
              A few optional questions so suggestions fit your actual days. Every one of them can be changed or cleared
              later, and skipping the whole thing is a supported answer.
            </p>
          </div>
        )}

        {step === 1 && (
          <>
            <div>
              <h1 className="text-title-2">A little about you</h1>
              <p className="mt-2 text-callout text-muted">This shapes the tone of suggestions, nothing more.</p>
            </div>
            <Section title="Life stage" headingLevel={2}>
              <div className="grid grid-cols-2 gap-2">
                {lifeStages.map((value) => {
                  const active = profile.lifeStage === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setProfile({ ...profile, lifeStage: value as LifeStage })}
                      className={clsx(
                        "focus-ring min-h-touch rounded-md px-3 py-3 text-left text-callout font-medium transition",
                        active ? "border border-accent bg-accent-wash text-accent-text" : `${surface} text-muted hover:bg-sunken`
                      )}
                    >
                      {toLabel(value)}
                    </button>
                  );
                })}
              </div>
            </Section>
            <Group>
              <div className="p-5">
                <Field label="Profession or role" hint="Optional.">
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      className={inputClass}
                      value={profile.profession ?? ""}
                      onChange={(event) => setProfile({ ...profile, profession: event.target.value || null })}
                      maxLength={120}
                      placeholder="Designer, engineer, caregiver…"
                    />
                  )}
                </Field>
              </div>
            </Group>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h1 className="text-title-2">What are you working on?</h1>
              <p className="mt-2 text-callout text-muted">Pick any that fit, or write your own.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {goalSuggestions.map((goal) => {
                const active = goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]))
                    }
                    className={clsx(
                      "focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-full px-4 text-footnote font-medium transition",
                      active ? "bg-accent-strong text-white" : `${surface} text-muted hover:bg-sunken`
                    )}
                  >
                    {active && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                    {goal}
                  </button>
                );
              })}
            </div>
            <Group>
              <div className="space-y-5 p-5">
                <Field label="Anything else" hint="Comma separated.">
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      className={inputClass}
                      value={goalText}
                      onChange={(event) => setGoalText(event.target.value)}
                      placeholder="Finish the side project…"
                    />
                  )}
                </Field>
                <Field label="Interests" hint="Helps suggestions feel less generic. Optional.">
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      className={inputClass}
                      value={interestText}
                      onChange={(event) => setInterestText(event.target.value)}
                      placeholder="Cooking, design, football…"
                    />
                  )}
                </Field>
              </div>
            </Group>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h1 className="text-title-2">Your usual rhythm</h1>
              <p className="mt-2 text-callout text-muted">Used to time suggestions and to find your active window.</p>
            </div>
            <Group>
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <Field label="Usual wake time">
                  {({ id }) => (
                    <input
                      id={id}
                      className={inputClass}
                      type="time"
                      value={profile.preferredWakeTime ?? ""}
                      onChange={(event) => setProfile({ ...profile, preferredWakeTime: event.target.value || null })}
                    />
                  )}
                </Field>
                <Field label="Usual sleep time">
                  {({ id }) => (
                    <input
                      id={id}
                      className={inputClass}
                      type="time"
                      value={profile.preferredSleepTime ?? ""}
                      onChange={(event) => setProfile({ ...profile, preferredSleepTime: event.target.value || null })}
                    />
                  )}
                </Field>
              </div>
            </Group>
            <Section title="Activity level" headingLevel={2}>
              <div className="grid gap-2">
                {activityLevels.map((value) => {
                  const active = profile.activityLevel === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setProfile({ ...profile, activityLevel: value as ActivityLevel })}
                      className={clsx(
                        "focus-ring flex min-h-touch items-center justify-between rounded-md px-4 text-callout font-medium transition",
                        active ? "border border-accent bg-accent-wash text-accent-text" : `${surface} text-muted hover:bg-sunken`
                      )}
                    >
                      {toLabel(value)}
                      {active && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <h1 className="text-title-2">How should Planora nudge you?</h1>
              <p className="mt-2 text-callout text-muted">Sets the tone of suggestions. Change it any time.</p>
            </div>
            <div className="grid gap-2">
              {improvementStyles.map((value) => {
                const active = profile.improvementStyle === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setProfile({ ...profile, improvementStyle: value as ImprovementStyle })}
                    className={clsx(
                      "focus-ring flex min-h-touch items-center justify-between rounded-md px-4 py-3 text-callout font-medium transition",
                      active ? "border border-accent bg-accent-wash text-accent-text" : `${surface} text-muted hover:bg-sunken`
                    )}
                  >
                    {toLabel(value)}
                    {active && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div>
              <h1 className="text-title-2">Your data, your call</h1>
              <p className="mt-2 text-callout text-muted">
                Planora runs on this machine. Nothing here is required, and both switches can be turned off later.
              </p>
            </div>
            <Group>
              <Toggle
                icon={Sparkles}
                label="Use my answers for personalization"
                description="Lets goals, routine and coaching style shape suggestions."
                checked={profile.useForPersonalization}
                onChange={(value) => setProfile({ ...profile, useForPersonalization: value })}
              />
              <Toggle
                icon={Brain}
                label="Let the companion read my records"
                description="Turning this off keeps the companion working, but it answers without your history and pauses personalized suggestions."
                checked={personalization}
                onChange={setPersonalization}
              />
            </Group>
          </>
        )}

        {error && <Banner tone="error">{error}</Banner>}
      </div>

      <div className="mt-8 flex items-center gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((value) => value - 1)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>
        )}
        <Button
          className="ml-auto"
          disabled={saving}
          onClick={() => (isLast ? void finish() : setStep((value) => value + 1))}
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isLast ? (saving ? "Saving" : "Finish setup") : "Continue"}
          {!isLast && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}
