import { Icon as Ionicons } from "../icon";
import { Text, View } from "react-native";
import { colors } from "../theme";
import { styles } from "../styles";
import { Button, Empty, FadeIn, Group, SectionTitle } from "../ui";
import { formatDate } from "../api";
import type { DashboardData, Task } from "../types";

/**
 * Focus mode - the mobile counterpart of the web app's /app/focus.
 *
 * The dashboard answers "what is my day"; this answers "what am I doing right
 * now", which is a different question and deserves a screen with nothing else
 * on it. It reads from the dashboard payload already in memory rather than
 * fetching, so opening it is instant and it cannot disagree with the dashboard.
 */
export function FocusScreen({
  palette,
  data,
  completeTask
}: {
  palette: ReturnType<typeof colors>;
  data: DashboardData | null;
  completeTask: (task: Task) => Promise<void>;
}) {
  const candidates = (data?.todayTasks ?? []).filter((task) => task.status !== "COMPLETED");
  const next = candidates[0];
  const remaining = Math.max(0, candidates.length - 1);

  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle palette={palette} title="One thing at a time" />
        {next ? (
          <FadeIn>
            <Group palette={palette}>
              <View style={styles.groupRow}>
                <View style={styles.flex}>
                  <Text style={[styles.itemMeta, { color: palette.muted }]}>
                    {next.dueDate ? `Due ${formatDate(next.dueDate)}` : "No due date"}
                    {next.category ? ` · ${next.category.toLowerCase()}` : ""}
                  </Text>
                  <Text style={[styles.heroTitle, { color: palette.text }]}>{next.title}</Text>
                  {!!next.description && (
                    <Text style={[styles.body, { color: palette.muted }]}>{next.description}</Text>
                  )}
                </View>
              </View>
              <View style={styles.groupRow}>
                <View style={styles.flex}>
                  <Button
                    palette={palette}
                    icon="checkmark-circle-outline"
                    label="Mark complete"
                    onPress={() => void completeTask(next)}
                  />
                  <Text style={[styles.itemMeta, { color: palette.faint }]}>
                    {remaining === 0
                      ? "Nothing else due today."
                      : `${remaining} more due today, hidden on purpose.`}
                  </Text>
                </View>
              </View>
            </Group>
          </FadeIn>
        ) : (
          <Empty
            palette={palette}
            icon="checkmark-done-outline"
            title="Nothing due today"
            body="Focus mode shows the next task due today. Add one when you are ready."
          />
        )}
      </View>

      <View>
        <SectionTitle palette={palette} title="Why only one" />
        <Group palette={palette}>
          <View style={styles.groupRow}>
            <Ionicons name="information-circle-outline" size={19} color={palette.orange} />
            <Text style={[styles.body, styles.flex, { color: palette.muted }]}>
              A list invites triage. A single task invites work. Everything else is still on the
              Tasks screen when you want the full picture.
            </Text>
          </View>
        </Group>
      </View>
    </View>
  );
}
