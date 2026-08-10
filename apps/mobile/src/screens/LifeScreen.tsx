import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View
} from "react-native";
import { taskCategories } from "@planora/shared";
import type { ActivityEntry } from "../types";
import { quickActivities, colors } from "../theme";
import { Card, SectionTitle, Input, Button, OptionChips, Metric, ActivityRow, Empty } from "../ui";
import { styles } from "../styles";

export function LifeScreen({
  palette,
  today,
  recent,
  api,
  guarded
}: {
  palette: ReturnType<typeof colors>;
  today: ActivityEntry[];
  recent: ActivityEntry[];
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState({ title: "", category: "PERSONAL", minutes: "20", notes: "" });
  const [showCustomLog, setShowCustomLog] = useState(false);

  async function save(activity = draft) {
    const payload = {
      title: activity.title,
      category: activity.category,
      minutes: Number(activity.minutes || 0),
      notes: activity.notes || undefined,
      occurredAt: new Date().toISOString()
    };
    await guarded(() => api("/activities", { method: "POST", body: JSON.stringify(payload) }), "Life log saved.");
    setDraft({ title: "", category: "PERSONAL", minutes: "20", notes: "" });
  }

  async function removeActivity(id: string) {
    await guarded(() => api(`/activities/${id}`, { method: "DELETE" }), "Life log deleted.");
  }

  function confirmRemoveActivity(item: ActivityEntry) {
    Alert.alert("Delete life log?", item.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeActivity(item.id) }
    ]);
  }

  const foodCount = recent.filter((item) => /food|meal|pizza|burger|ate|dinner|lunch|breakfast/i.test(item.title)).length;
  const fitnessMinutes = recent.filter((item) => item.category === "FITNESS").reduce((sum, item) => sum + item.minutes, 0);
  const socialCount = recent.filter((item) => item.category === "SOCIAL").length;

  return (
    <View style={styles.stack}>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Quick logs" action={showCustomLog ? "Close" : "Custom"} onAction={() => setShowCustomLog(!showCustomLog)} />
        <View style={styles.quickGrid}>
          {quickActivities.map((item) => (
            <Pressable key={item.title} style={[styles.quickTile, { backgroundColor: palette.soft, borderColor: palette.border }]} onPress={() => void save({ ...item, minutes: String(item.minutes), notes: "" })}>
              <Ionicons name={item.icon} size={21} color={palette.orange} />
              <Text style={[styles.quickText, { color: palette.text }]}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      {showCustomLog && <Card palette={palette}>
        <SectionTitle palette={palette} title="Log something" />
        <Input palette={palette} label="What happened?" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} placeholder="Ate rice, hit chest, called Sam..." />
        <OptionChips palette={palette} label="Category" value={draft.category} options={[...taskCategories]} onChange={(category) => setDraft({ ...draft, category })} />
        <Input palette={palette} label="Minutes" value={draft.minutes} onChangeText={(minutes) => setDraft({ ...draft, minutes })} keyboardType="number-pad" />
        <Input palette={palette} label="Notes" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })} multiline />
        <Button palette={palette} icon="add-circle-outline" label="Save life log" onPress={() => void save()} disabled={!draft.title.trim()} />
      </Card>}
      <View style={styles.metricGrid}>
        <Metric palette={palette} icon="restaurant-outline" label="Food logs" value={String(foodCount)} tone="orange" />
        <Metric palette={palette} icon="barbell-outline" label="Fitness" value={`${fitnessMinutes}m`} tone="sky" />
        <Metric palette={palette} icon="people-outline" label="Social" value={String(socialCount)} tone="green" />
      </View>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Today" />
        {today.length === 0 ? <Empty palette={palette} icon="walk-outline" title="No logs today" body="Use a quick log to teach Planora what your day looks like." /> : today.map((item) => <ActivityRow key={item.id} palette={palette} item={item} onDelete={() => confirmRemoveActivity(item)} />)}
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Recent pattern" />
        {recent.slice(0, 8).map((item) => <ActivityRow key={item.id} palette={palette} item={item} onDelete={() => confirmRemoveActivity(item)} />)}
      </Card>
    </View>
  );
}
