"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Brain, Eraser, Sparkles } from "lucide-react";
import { activityLevels, improvementStyles, lifeStages } from "@planora/shared";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Section } from "../../../components/ui/surfaces";
import { Button, Field, Select, Toggle, inputClass, textareaClass } from "../../../components/ui/controls";
import { Banner, SkeletonPage } from "../../../components/ui/feedback";
import { apiRequest } from "../../../lib/api";
import { label as toLabel, optionalNumber, parseList } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import { useResource } from "../../../lib/useResource";
import type { ActivityLevel, ImprovementStyle, LifeStage, PersonalProfile } from "../../../lib/types";

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
  useForPersonalization: false,
  allowAnonymousTraining: false
};

/** Mirrors `profileCompleteness` in the API so the figure means the same thing. */
function completenessOf(profile: PersonalProfile): number {
  const values = [
    profile.lifeStage,
    profile.profession,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevel,
    profile.interests.length,
    profile.primaryGoals.length,
    profile.preferredWakeTime,
    profile.preferredSleepTime
  ];
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export default function ProfilePage() {
  const { guard } = useMessages();
  const resource = useResource<{ profile: PersonalProfile | null }>("/profile");
  const [profile, setProfile] = useState<PersonalProfile>(emptyProfile);
  const [goalText, setGoalText] = useState("");
  const [interestText, setInterestText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resource.status !== "ready") return;
    const next = { ...emptyProfile, ...(resource.data?.profile ?? {}) };
    setProfile(next);
    setGoalText(next.primaryGoals.join(", "));
    setInterestText(next.interests.join(", "));
  }, [resource.status, resource.data]);

  if (resource.status === "loading") return <SkeletonPage metrics={0} rows={6} />;

  const completeness = completenessOf(profile);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    await guard(async () => {
      const body = {
        ...profile,
        primaryGoals: parseList(goalText, 8),
        interests: parseList(interestText, 12)
      };
      const saved = await apiRequest<{ profile: PersonalProfile }>("/profile", { method: "PUT", body });
      setProfile({ ...emptyProfile, ...saved.profile });
      setGoalText(saved.profile.primaryGoals.join(", "));
      setInterestText(saved.profile.interests.join(", "));
    }, "Profile saved.");
    setSaving(false);
  }

  async function clear() {
    if (!window.confirm("Clear all optional profile details and any profile-derived AI memory?")) return;
    await guard(async () => {
      await apiRequest("/profile", { method: "DELETE" });
      setProfile(emptyProfile);
      setGoalText("");
      setInterestText("");
      await resource.reload();
    }, "Profile cleared.");
  }

  return (
    <>
      <PageHeader
        eyebrow="You decide what is known"
        title="Profile"
        description="Every field here is optional, and none of it is used for anything until you switch it on below."
      />

      {resource.status === "error" && <Banner tone="error">{resource.error ?? "Profile could not be loaded."}</Banner>}

      <form onSubmit={save} className="max-w-3xl space-y-8">
        <Section
          title="Daily context"
          action={<span className="tabular text-footnote font-medium text-muted">{completeness}% filled in</span>}
        >
          <div
            className="mb-3 h-1 overflow-hidden rounded-full bg-sunken"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-route" style={{ width: `${completeness}%` }} />
          </div>
          <Group>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Life stage">
                {({ id }) => (
                  <Select
                    id={id}
                    value={profile.lifeStage ?? ""}
                    includeEmpty="Not set"
                    onChange={(value) => setProfile({ ...profile, lifeStage: (value || null) as LifeStage | null })}
                    options={lifeStages.map((value) => ({ value, label: toLabel(value) }))}
                  />
                )}
              </Field>
              <Field label="Profession or role">
                {({ id }) => (
                  <input
                    id={id}
                    className={inputClass}
                    maxLength={120}
                    value={profile.profession ?? ""}
                    onChange={(event) => setProfile({ ...profile, profession: event.target.value || null })}
                    placeholder="Designer, engineer, caregiver…"
                  />
                )}
              </Field>
              <Field label="Activity level">
                {({ id }) => (
                  <Select
                    id={id}
                    value={profile.activityLevel ?? ""}
                    includeEmpty="Not set"
                    onChange={(value) => setProfile({ ...profile, activityLevel: (value || null) as ActivityLevel | null })}
                    options={activityLevels.map((value) => ({ value, label: toLabel(value) }))}
                  />
                )}
              </Field>
              <Field label="Coaching style" hint="Sets the tone of suggestions.">
                {({ id, describedBy }) => (
                  <Select
                    id={id}
                    describedBy={describedBy}
                    value={profile.improvementStyle}
                    onChange={(value) => setProfile({ ...profile, improvementStyle: value as ImprovementStyle })}
                    options={improvementStyles.map((value) => ({ value, label: toLabel(value) }))}
                  />
                )}
              </Field>
              <Field label="Height (cm)" hint="Never used to judge or diagnose.">
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    className={inputClass}
                    type="number"
                    min={80}
                    max={250}
                    value={profile.heightCm ?? ""}
                    onChange={(event) => setProfile({ ...profile, heightCm: optionalNumber(event.target.value) })}
                  />
                )}
              </Field>
              <Field label="Weight (kg)" hint="Excluded from any training export.">
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    className={inputClass}
                    type="number"
                    step="0.1"
                    min={25}
                    max={400}
                    value={profile.weightKg ?? ""}
                    onChange={(event) => setProfile({ ...profile, weightKg: optionalNumber(event.target.value) })}
                  />
                )}
              </Field>
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
        </Section>

        <Section title="Goals and interests">
          <Group>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Primary goals" hint="Up to 8, comma separated.">
                {({ id, describedBy }) => (
                  <textarea
                    id={id}
                    aria-describedby={describedBy}
                    className={textareaClass}
                    value={goalText}
                    onChange={(event) => setGoalText(event.target.value)}
                    placeholder="Build a gym routine, protect my evenings…"
                  />
                )}
              </Field>
              <Field label="Interests" hint="Up to 12, comma separated.">
                {({ id, describedBy }) => (
                  <textarea
                    id={id}
                    aria-describedby={describedBy}
                    className={textareaClass}
                    value={interestText}
                    onChange={(event) => setInterestText(event.target.value)}
                    placeholder="Cooking, design, football…"
                  />
                )}
              </Field>
            </div>
          </Group>
        </Section>

        <Section title="Data choices">
          <Group>
            <Toggle
              icon={Brain}
              label="Use my profile for personalization"
              description="Lets the fields above reach the companion and the suggestion ranker. Off means they are stored but never read."
              checked={profile.useForPersonalization}
              onChange={(value) => setProfile({ ...profile, useForPersonalization: value })}
            />
            <Toggle
              icon={Sparkles}
              label="Contribute anonymous training rows"
              description="Allows a pseudonymous export of structured events. Identity, free text, height and weight are stripped, and the participant id is hashed."
              checked={profile.allowAnonymousTraining}
              onChange={(value) => setProfile({ ...profile, allowAnonymousTraining: value })}
            />
          </Group>
        </Section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving" : "Save profile"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void clear()}>
            <Eraser className="size-4" aria-hidden="true" />
            Clear profile
          </Button>
        </div>
      </form>
    </>
  );
}
