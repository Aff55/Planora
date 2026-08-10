import {
  Text,
  View
} from "react-native";
import type { NeuralEngineStatus, Recommendation } from "../types";
import { colors } from "../theme";
import { friendlyLabel } from "../utils";
import { Card, SectionTitle, Metric, RecommendationCard, Empty, Pill } from "../ui";
import { styles } from "../styles";

export function InsightsScreen({
  palette,
  recommendations,
  neural,
  api,
  guarded
}: {
  palette: ReturnType<typeof colors>;
  recommendations: Recommendation[];
  neural: NeuralEngineStatus | null;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric palette={palette} icon="hardware-chip-outline" label="Learning" value={`${Math.round((neural?.confidence ?? 0) * 100)}%`} tone="orange" />
        <Metric palette={palette} icon="flame-outline" label="App streak" value={`${neural?.engagement.currentAppStreak ?? 0}d`} tone="sky" />
        <Metric palette={palette} icon="calendar-outline" label="Active days" value={String(neural?.engagement.activeDays30 ?? 0)} tone="green" />
      </View>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Active recommendations" />
        {recommendations.length === 0 ? (
          <Empty palette={palette} icon="bulb-outline" title="Nothing active" body="Planora will add recommendations as patterns appear." />
        ) : (
          recommendations.map((rec) => (
            <RecommendationCard key={rec.id} palette={palette} rec={rec} onAccept={() => void guarded(() => api(`/recommendations/${rec.id}/feedback`, { method: "POST", body: JSON.stringify({ action: "ACCEPTED" }) }), "Recommendation accepted.")} onDismiss={() => void guarded(() => api(`/recommendations/${rec.id}/feedback`, { method: "POST", body: JSON.stringify({ action: "DISMISSED" }) }), "Recommendation dismissed.")} />
          ))
        )}
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Learning engine" />
        <Text style={[styles.itemTitle, { color: palette.text }]}>{neural?.engine ?? "LOCAL_ONLINE_RANKER"}</Text>
        <Text style={[styles.body, { color: palette.muted }]}>Focus window: {neural?.focusWindow ? `${neural.focusWindow.label} (${neural.focusWindow.averageFocus}/10)` : "Learning"}</Text>
        {!!neural && <Text style={[styles.body, { color: palette.muted }]}>Readiness: {friendlyLabel(neural.engagement.readiness)}</Text>}
        {neural?.detectedHabits.slice(0, 5).map((habit) => (
          <Pill
            key={habit.key}
            palette={palette}
            label={`${habit.title}: ${habit.streak}d streak, ${Math.round(habit.confidence * 100)}% confidence`}
          />
        ))}
        {neural?.topSignals.map((signal) => <Pill key={signal} palette={palette} label={signal} />)}
        {neural?.nextImprovements.map((item) => <Text key={item} style={[styles.body, { color: palette.muted }]}>- {item}</Text>)}
      </Card>
    </View>
  );
}
