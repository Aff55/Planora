import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { AIHistoryItem, CompanionContext, CompanionStatus } from "../types";
import { colors } from "../theme";
import { SectionTitle, Input, Button, Bubble, Empty, Group, FadeIn } from "../ui";
import { styles } from "../styles";

export function CompanionScreen({
  palette,
  history,
  status,
  context,
  personalizationEnabled,
  api,
  guarded
}: {
  palette: ReturnType<typeof colors>;
  history: AIHistoryItem[];
  status: CompanionStatus | null;
  context: CompanionContext | null;
  personalizationEnabled: boolean;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const visible = history.slice(-5);

  async function send(text = message) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    await guarded(
      () => api("/companion/chat", { method: "POST", body: JSON.stringify({ message: trimmed }) }).then(() => setMessage("")),
      "Companion answered."
    );
    setSending(false);
  }

  const providerLabel = status?.provider === "OLLAMA" ? status.model : "Planora Core";

  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle palette={palette} title="What it can see" />
        <Group palette={palette}>
          <View style={styles.groupRow}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: status?.ollamaAvailable ? palette.green : "#f59e0b"
              }}
            />
            <Text style={[styles.body, styles.flex, { color: palette.muted }]}>
              {providerLabel}
              {context
                ? ` · ${context.counts.todayTasks} today · ${context.counts.upcomingTasks} upcoming · ${Math.round(
                    context.learning.confidence * 100
                  )}% learned`
                : personalizationEnabled
                  ? " · loading context"
                  : " · personalization off"}
            </Text>
          </View>
        </Group>
      </View>

      {visible.length === 0 && (
        <View style={styles.row}>
          {["I ate pizza", "I hit chest", "Improve tomorrow"].map((prompt) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              style={[styles.chip, { backgroundColor: palette.card, borderColor: palette.border }]}
              onPress={() => void send(prompt)}
            >
              <Text style={[styles.chipText, { color: palette.text }]}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View>
        <SectionTitle palette={palette} title="Chat" />
        {visible.length === 0 ? (
          <Empty
            palette={palette}
            icon="chatbubble-ellipses-outline"
            title="Your companion is ready"
            body="Send a short update, or ask what would improve tomorrow."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {visible.map((item, index) => (
              <FadeIn key={item.id} index={index}>
                <View style={styles.chatTurn}>
                  <Bubble palette={palette} role="user" text={item.prompt} />
                  <Bubble
                    palette={palette}
                    role="assistant"
                    text={item.response}
                    meta={item.provider === "OLLAMA" ? "Ollama" : "Planora Core"}
                  />
                </View>
              </FadeIn>
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Input
          palette={palette}
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Short update or question…"
          multiline
        />
        <Button
          palette={palette}
          icon="send-outline"
          label={sending ? "Sending" : "Send"}
          disabled={!message.trim() || sending}
          onPress={() => void send()}
        />
      </View>
    </View>
  );
}
