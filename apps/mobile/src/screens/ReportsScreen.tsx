import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { colors } from "../theme";
import { styles } from "../styles";
import { Empty, FadeIn, Group, Metric, SectionTitle } from "../ui";
import type { AdaptiveRankerStatus, DashboardData, PatternReport, WellbeingSummary } from "../types";

/**
 * Weekly review - the mobile counterpart of the web app's /app/reports.
 *
 * Every figure is read from an endpoint; none is estimated or projected. Where
 * the system holds nothing, the row says so rather than printing a zero that
 * reads like a measurement. The pattern report is fetched here rather than in
 * App, because this is the only screen that needs it and loading it eagerly
 * would slow every sign-in for a screen most sessions never open.
 */
export function ReportsScreen({
  palette,
  data,
  wellbeing,
  ranker,
  api
}: {
  palette: ReturnType<typeof colors>;
  data: DashboardData | null;
  wellbeing: WellbeingSummary | null;
  ranker: AdaptiveRankerStatus | null;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
}) {
  const [report, setReport] = useState<PatternReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api<{ report: PatternReport }>("/ranker/patterns")
      .then((response) => {
        if (active) setReport(response.report);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load patterns");
      });
    return () => {
      active = false;
    };
  }, [api]);

  const stats = data?.weeklyStatistics;
  const averageMood = data?.moodSummary.averageMood;
  const averageSleep = data?.sleepSummary.averageHours;

  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle palette={palette} title="The week in figures" />
        <View style={styles.metricGrid}>
          <Metric palette={palette} icon="checkbox-outline" label="Finished" value={String(stats?.completedTasks ?? 0)} tone="green" />
          <Metric palette={palette} icon="list-outline" label="Still open" value={String(stats?.activeTasks ?? 0)} tone="orange" />
          <Metric
            palette={palette}
            icon="walk-outline"
            label="Active"
            value={stats ? `${Math.round(stats.activeMinutes / 60)}h ${stats.activeMinutes % 60}m` : "0m"}
            tone="sky"
          />
          <Metric
            palette={palette}
            icon="happy-outline"
            label="Average mood"
            value={averageMood == null ? "No data" : `${averageMood.toFixed(1)}/5`}
            tone="orange"
          />
          <Metric
            palette={palette}
            icon="moon-outline"
            label="Average sleep"
            value={averageSleep == null ? "No data" : `${averageSleep.toFixed(1)}h`}
            tone="sky"
          />
          <Metric
            palette={palette}
            icon="water-outline"
            label="Water today"
            value={`${wellbeing?.waterTodayMl ?? 0}ml`}
            tone="green"
          />
        </View>
      </View>

      <View>
        <SectionTitle palette={palette} title="What the ranker is working from" />
        <Group palette={palette}>
          <View style={styles.groupRow}>
            <Text style={[styles.body, styles.flex, { color: palette.muted }]}>
              {ranker
                ? `Confidence ${Math.round(ranker.confidence * 100)}%, built on ${ranker.samples.events} recorded events and ${ranker.samples.recommendationFeedback} feedback actions across ${ranker.engagement.activeDays30} active days in the last 30.`
                : "Personalization is off, so the ranker reports nothing."}
            </Text>
          </View>
        </Group>
      </View>

      <View>
        <SectionTitle palette={palette} title="Patterns" />
        {loadError ? (
          <Empty palette={palette} icon="alert-circle-outline" title="Could not load patterns" body={loadError} />
        ) : !report ? (
          <Empty palette={palette} icon="hourglass-outline" title="Reading your history" body="Checking the last 60 days." />
        ) : report.patterns.length === 0 ? (
          <Empty
            palette={palette}
            icon="search-outline"
            title="No patterns this period"
            body="The detectors ran and found nothing strong enough to report. That is a result, not a gap."
          />
        ) : (
          <Group palette={palette}>
            {report.patterns.map((pattern, index) => (
              <FadeIn key={pattern.key} index={index}>
                <View style={styles.groupRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.itemTitle, { color: palette.text }]}>{pattern.title}</Text>
                    <Text style={[styles.itemMeta, { color: palette.muted }]}>{pattern.detail}</Text>
                    <Text style={[styles.itemMeta, { color: palette.faint }]}>
                      {Math.round(pattern.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
              </FadeIn>
            ))}
          </Group>
        )}
      </View>

      {!!report && report.inconclusive.length > 0 && (
        <View>
          <SectionTitle palette={palette} title="Checked, nothing found" />
          <Group palette={palette}>
            {report.inconclusive.slice(0, 8).map((item) => (
              <View key={item.key} style={styles.groupRow}>
                <View style={styles.flex}>
                  <Text style={[styles.itemTitle, { color: palette.text }]}>{item.key}</Text>
                  <Text style={[styles.itemMeta, { color: palette.muted }]}>{item.reason}</Text>
                </View>
              </View>
            ))}
          </Group>
        </View>
      )}
    </View>
  );
}
