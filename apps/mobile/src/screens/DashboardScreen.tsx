import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { DashboardData, Task } from "../types";
import { IconName, ScreenName, colors } from "../theme";
import { SectionTitle, Metric, TaskRow, RecommendationCard, Empty, Centered, Group, FadeIn } from "../ui";
import { styles } from "../styles";

export function DashboardScreen({
  palette,
  data,
  setScreen,
  completeTask,
  feedback
}: {
  palette: ReturnType<typeof colors>;
  data: DashboardData | null;
  setScreen: (screen: ScreenName) => void;
  completeTask: (task: Task) => void;
  feedback: (id: string, action: "ACCEPTED" | "DISMISSED") => void;
}) {
  if (!data)
    return (
      <Centered
        palette={palette}
        icon="analytics-outline"
        title="Loading"
        body="Pull down to refresh if this takes too long."
      />
    );

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric
          palette={palette}
          icon="bar-chart-outline"
          label="Day score"
          value={String(data.productivityScore)}
          animateTo={data.productivityScore}
          tone="orange"
        />
        <Metric
          palette={palette}
          icon="sparkles-outline"
          label="Best streak"
          value={String(data.streak)}
          animateTo={data.streak}
          tone="green"
        />
        <Metric
          palette={palette}
          icon="walk-outline"
          label="Life logged"
          value={`${data.lifeSummary.weeklyMinutes}m`}
          animateTo={data.lifeSummary.weeklyMinutes}
          suffix="m"
          tone="sky"
        />
        <Metric
          palette={palette}
          icon="water-outline"
          label="Water today"
          value={`${data.waterIntake.todayMl}/${data.waterIntake.targetMl}ml`}
          tone="green"
        />
      </View>

      <View>
        <SectionTitle palette={palette} title="Due today" action="All tasks" onAction={() => setScreen("Tasks")} />
        {data.todayTasks.length === 0 ? (
          <Empty
            palette={palette}
            icon="checkbox-outline"
            title="Nothing due today"
            body="Add one useful task when you are ready."
          />
        ) : (
          data.todayTasks.map((task, index) => (
            <FadeIn key={task.id} index={index}>
              <TaskRow palette={palette} task={task} onDone={() => completeTask(task)} />
            </FadeIn>
          ))
        )}
      </View>

      <View>
        <SectionTitle palette={palette} title="Quick actions" />
        <View style={styles.quickGrid}>
          {(
            [
              ["Tasks", "checkbox-outline"],
              ["Calendar", "calendar-outline"],
              ["Life", "walk-outline"],
              ["Wellbeing", "heart-outline"],
              ["Companion", "chatbubble-ellipses-outline"],
              ["Insights", "analytics-outline"]
            ] as const
          ).map(([name, icon]) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => setScreen(name as ScreenName)}
              style={[styles.quickTile, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <Ionicons name={icon as IconName} size={19} color={palette.orange} />
              <Text style={[styles.quickText, { color: palette.text }]}>{name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <SectionTitle palette={palette} title="Companion" action="Chat" onAction={() => setScreen("Companion")} />
        <Group palette={palette}>
          <View style={styles.groupRow}>
            <Text style={[styles.body, styles.flex, { color: palette.muted }]}>
              {data.aiCompanion.latestMessage ?? data.aiCompanion.prompt}
            </Text>
          </View>
        </Group>
      </View>

      <View>
        <SectionTitle
          palette={palette}
          title="Recommendations"
          action="Details"
          onAction={() => setScreen("Insights")}
        />
        {data.recommendations.length === 0 ? (
          <Empty
            palette={palette}
            icon="bulb-outline"
            title="No recommendations yet"
            body="Planora learns as you log real life."
          />
        ) : (
          data.recommendations.slice(0, 3).map((rec, index) => (
            <FadeIn key={rec.id} index={index}>
              <RecommendationCard
                palette={palette}
                rec={rec}
                onAccept={() => feedback(rec.id, "ACCEPTED")}
                onDismiss={() => feedback(rec.id, "DISMISSED")}
              />
            </FadeIn>
          ))
        )}
      </View>
    </View>
  );
}
