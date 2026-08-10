import { useState } from "react";
import {
  Alert,
  Text,
  View
} from "react-native";
import { moodValues, sleepQualities } from "@planora/shared";
import { formatDate } from "../api";
import type { WellbeingSummary } from "../types";
import { colors } from "../theme";
import { Card, SectionTitle, Input, Button, SmallButton, OptionChips, Metric } from "../ui";
import { styles } from "../styles";

export function WellbeingScreen({
  palette,
  summary,
  api,
  guarded
}: {
  palette: ReturnType<typeof colors>;
  summary: WellbeingSummary | null;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
}) {
  const [mood, setMood] = useState("OKAY");
  const [stress, setStress] = useState("5");
  const [energy, setEnergy] = useState("5");
  const [reflection, setReflection] = useState("");
  const [sleepHours, setSleepHours] = useState("7");
  const [sleepQuality, setSleepQuality] = useState("GOOD");
  const [sleepNotes, setSleepNotes] = useState("");
  const [water, setWater] = useState("300");
  const [journal, setJournal] = useState({ title: "", body: "", mood: "" });

  async function removeWellbeing(kind: "mood" | "sleep" | "journal", id: string) {
    await guarded(() => api(`/wellbeing/${kind}/${id}`, { method: "DELETE" }), `${kind === "journal" ? "Journal entry" : kind} deleted.`);
  }

  function confirmRemoveWellbeing(kind: "mood" | "sleep" | "journal", id: string) {
    const label = kind === "journal" ? "journal entry" : `${kind} log`;
    Alert.alert(`Delete ${label}?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeWellbeing(kind, id) }
    ]);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric palette={palette} icon="water-outline" label="Water" value={`${summary?.waterTodayMl ?? 0}ml`} tone="sky" />
        <Metric palette={palette} icon="happy-outline" label="Mood logs" value={String(summary?.moodLogs.length ?? 0)} tone="green" />
        <Metric palette={palette} icon="moon-outline" label="Sleep logs" value={String(summary?.sleepLogs.length ?? 0)} tone="orange" />
      </View>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Mood check-in" />
        <OptionChips palette={palette} label="Mood" value={mood} options={[...moodValues]} onChange={setMood} />
        <View style={styles.twoCol}>
          <Input palette={palette} label="Stress" value={stress} onChangeText={setStress} keyboardType="number-pad" />
          <Input palette={palette} label="Energy" value={energy} onChangeText={setEnergy} keyboardType="number-pad" />
        </View>
        <Input palette={palette} label="Reflection" value={reflection} onChangeText={setReflection} multiline />
        <Button palette={palette} icon="heart-outline" label="Save mood" onPress={() => void guarded(() => api("/wellbeing/mood", { method: "POST", body: JSON.stringify({ mood, stress: Number(stress), energy: Number(energy), reflection }) }), "Mood saved.")} />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Sleep and water" />
        <Input palette={palette} label="Sleep hours" value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" />
        <OptionChips palette={palette} label="Sleep quality" value={sleepQuality} options={[...sleepQualities]} onChange={setSleepQuality} />
        <Input palette={palette} label="Sleep notes" value={sleepNotes} onChangeText={setSleepNotes} multiline />
        <Button palette={palette} icon="moon-outline" label="Save sleep" onPress={() => void guarded(() => api("/wellbeing/sleep", { method: "POST", body: JSON.stringify({ hours: Number(sleepHours), quality: sleepQuality, notes: sleepNotes }) }), "Sleep saved.")} />
        <Input palette={palette} label="Water ml" value={water} onChangeText={setWater} keyboardType="number-pad" />
        <Button palette={palette} icon="water-outline" label="Add water" onPress={() => void guarded(() => api("/wellbeing/water", { method: "POST", body: JSON.stringify({ amountMl: Number(water) }) }), "Water logged.")} />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Journal" />
        <Input palette={palette} label="Title" value={journal.title} onChangeText={(title) => setJournal({ ...journal, title })} />
        <Input palette={palette} label="Body" value={journal.body} onChangeText={(body) => setJournal({ ...journal, body })} multiline />
        <OptionChips palette={palette} label="Mood tag" value={journal.mood} options={["", ...moodValues]} labels={{ "": "None" }} onChange={(nextMood) => setJournal({ ...journal, mood: nextMood })} />
        <Button palette={palette} icon="book-outline" label="Save journal" disabled={!journal.title.trim() || !journal.body.trim()} onPress={() => void guarded(() => api("/wellbeing/journal", { method: "POST", body: JSON.stringify({ title: journal.title, body: journal.body, mood: journal.mood || undefined }) }).then(() => setJournal({ title: "", body: "", mood: "" })), "Journal saved.")} />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Recent wellbeing" />
        <Text style={[styles.body, { color: palette.muted }]}>{summary?.safetyNote}</Text>
        {summary?.moodLogs.slice(0, 3).map((entry) => (
          <View key={entry.id} style={[styles.listItem, { borderColor: palette.border, backgroundColor: palette.soft }]}>
            <Text style={[styles.itemTitle, { color: palette.text }]}>{entry.mood}</Text>
            <Text style={[styles.itemMeta, { color: palette.muted }]}>Stress {entry.stress}/10 - Energy {entry.energy}/10 - {formatDate(entry.loggedAt)}</Text>
            <SmallButton palette={palette} label="Delete" icon="trash-outline" danger onPress={() => confirmRemoveWellbeing("mood", entry.id)} />
          </View>
        ))}
        {summary?.sleepLogs.slice(0, 3).map((entry) => (
          <View key={entry.id} style={[styles.listItem, { borderColor: palette.border, backgroundColor: palette.soft }]}>
            <Text style={[styles.itemTitle, { color: palette.text }]}>{entry.hours}h - {entry.quality}</Text>
            <Text style={[styles.itemMeta, { color: palette.muted }]}>{formatDate(entry.loggedAt)}</Text>
            <SmallButton palette={palette} label="Delete" icon="trash-outline" danger onPress={() => confirmRemoveWellbeing("sleep", entry.id)} />
          </View>
        ))}
        {summary?.journals.slice(0, 5).map((entry) => (
          <View key={entry.id} style={[styles.listItem, { borderColor: palette.border, backgroundColor: palette.soft }]}>
            <Text style={[styles.itemTitle, { color: palette.text }]}>{entry.title}</Text>
            <Text numberOfLines={3} style={[styles.body, { color: palette.muted }]}>{entry.body}</Text>
            <SmallButton palette={palette} label="Delete" icon="trash-outline" danger onPress={() => confirmRemoveWellbeing("journal", entry.id)} />
          </View>
        ))}
      </Card>
    </View>
  );
}
