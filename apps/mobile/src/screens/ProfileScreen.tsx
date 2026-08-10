import { useEffect, useState } from "react";
import {
  Alert,
  Text,
  View
} from "react-native";
import { lifeStages, activityLevels, improvementStyles } from "@planora/shared";
import type { PersonalProfile } from "../types";
import { colors } from "../theme";
import { friendlyLabel, parseList, optionalNumber, profileCompleteness } from "../utils";
import { Card, SectionTitle, Input, Button, GhostButton, OptionChips, ToggleRow, Metric } from "../ui";
import { styles } from "../styles";

export function ProfileScreen({
  palette,
  profile,
  api,
  guarded
}: {
  palette: ReturnType<typeof colors>;
  profile: PersonalProfile;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PersonalProfile>(profile);
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? "");
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [goals, setGoals] = useState(profile.primaryGoals.join(", "));

  useEffect(() => {
    setDraft(profile);
    setHeight(profile.heightCm?.toString() ?? "");
    setWeight(profile.weightKg?.toString() ?? "");
    setInterests(profile.interests.join(", "));
    setGoals(profile.primaryGoals.join(", "));
  }, [profile]);

  async function save() {
    const input = {
      ...draft,
      heightCm: optionalNumber(height),
      weightKg: optionalNumber(weight),
      interests: parseList(interests, 12),
      primaryGoals: parseList(goals, 8)
    };
    delete input.id;
    await guarded(
      () => api("/profile", { method: "PUT", body: JSON.stringify(input) }),
      "Your profile and data choices are saved."
    );
  }

  function clear() {
    Alert.alert("Clear profile?", "This removes optional profile details and profile-specific AI memory.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => void guarded(() => api("/profile", { method: "DELETE" }), "Personal profile cleared.")
      }
    ]);
  }

  const lifeStageOptions = ["", ...lifeStages];
  const activityOptions = ["", ...activityLevels];
  const labels = Object.fromEntries(
    [...lifeStageOptions, ...activityOptions, ...improvementStyles].map((value) => [value, value ? friendlyLabel(value) : "Not set"])
  );

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric palette={palette} icon="person-outline" label="Profile" value={`${profileCompleteness(draft)}%`} tone="orange" />
        <Metric
          palette={palette}
          icon="sparkles-outline"
          label="Personalization"
          value={draft.useForPersonalization ? "On" : "Off"}
          tone="sky"
        />
      </View>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Daily context" />
        <Text style={[styles.body, { color: palette.muted }]}>Every field is optional.</Text>
        <OptionChips
          palette={palette}
          label="Life stage"
          value={draft.lifeStage ?? ""}
          options={lifeStageOptions}
          labels={labels}
          onChange={(lifeStage) => setDraft({ ...draft, lifeStage: (lifeStage || null) as PersonalProfile["lifeStage"] })}
        />
        <Input
          palette={palette}
          label="Profession or role"
          value={draft.profession ?? ""}
          onChangeText={(profession) => setDraft({ ...draft, profession: profession || null })}
          placeholder="Designer, engineer, caregiver..."
          maxLength={120}
        />
        <OptionChips
          palette={palette}
          label="Activity level"
          value={draft.activityLevel ?? ""}
          options={activityOptions}
          labels={labels}
          onChange={(activityLevel) =>
            setDraft({ ...draft, activityLevel: (activityLevel || null) as PersonalProfile["activityLevel"] })
          }
        />
        <OptionChips
          palette={palette}
          label="Coaching style"
          value={draft.improvementStyle}
          options={[...improvementStyles]}
          labels={labels}
          onChange={(improvementStyle) => setDraft({ ...draft, improvementStyle })}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input palette={palette} label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Optional" />
          </View>
          <View style={styles.flex}>
            <Input palette={palette} label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Optional" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              palette={palette}
              label="Wake time"
              value={draft.preferredWakeTime ?? ""}
              onChangeText={(preferredWakeTime) => setDraft({ ...draft, preferredWakeTime: preferredWakeTime || null })}
              placeholder="07:30"
              maxLength={5}
            />
          </View>
          <View style={styles.flex}>
            <Input
              palette={palette}
              label="Sleep time"
              value={draft.preferredSleepTime ?? ""}
              onChangeText={(preferredSleepTime) => setDraft({ ...draft, preferredSleepTime: preferredSleepTime || null })}
              placeholder="23:00"
              maxLength={5}
            />
          </View>
        </View>
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Goals and interests" />
        <Input
          palette={palette}
          label="Primary goals"
          hint="Separate up to 8 items with commas."
          value={goals}
          onChangeText={setGoals}
          placeholder="Build a gym routine, protect evenings..."
          multiline
        />
        <Input
          palette={palette}
          label="Interests"
          hint="Separate up to 12 items with commas."
          value={interests}
          onChangeText={setInterests}
          placeholder="Cooking, design, football..."
          multiline
        />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Data choices" />
        <ToggleRow
          palette={palette}
          label="Use profile for personalization"
          value={draft.useForPersonalization}
          onValueChange={(useForPersonalization) => setDraft({ ...draft, useForPersonalization })}
        />
        <Text style={[styles.hint, { color: palette.muted }]}>Adds these details to local companion context and recommendation ranking.</Text>
        <ToggleRow
          palette={palette}
          label="Anonymous training rows"
          value={draft.allowAnonymousTraining}
          onValueChange={(allowAnonymousTraining) => setDraft({ ...draft, allowAnonymousTraining })}
        />
        <Text style={[styles.hint, { color: palette.muted }]}>Exports omit identity, free text, height, and weight. Off by default.</Text>
        <ToggleRow
          palette={palette}
          label="Anonymous product analytics"
          value={draft.allowProductAnalytics}
          onValueChange={(allowProductAnalytics) => setDraft({ ...draft, allowProductAnalytics })}
        />
        <Text style={[styles.hint, { color: palette.muted }]}>Consent is stored, but no external analytics service is connected.</Text>
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Your control" />
        <Text style={[styles.body, { color: palette.muted }]}>
          Planora never uses these fields for diagnosis or body judgment. Turning personalization off removes profile-specific AI memory when saved.
        </Text>
        <Button palette={palette} icon="save-outline" label="Save profile" onPress={() => void save()} />
        <GhostButton palette={palette} label="Clear profile" onPress={clear} />
      </Card>
    </View>
  );
}
