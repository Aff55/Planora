import { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View
} from "react-native";
import { calendarEventTypes } from "@planora/shared";
import { currentMonthKey, formatDate, fromDateTimeLocal, toDateTimeLocal } from "../api";
import type { CalendarEvent } from "../types";
import { colors } from "../theme";
import { formatMonthKey } from "../utils";
import { Card, SectionTitle, Input, DateTimeField, Button, GhostButton, SmallButton, IconButton, OptionChips, Empty } from "../ui";
import { styles } from "../styles";

export function CalendarScreen({
  palette,
  events,
  api,
  guarded,
  hasMore,
  loadMore,
  month,
  changeMonth
}: {
  palette: ReturnType<typeof colors>;
  events: CalendarEvent[];
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  month: string;
  changeMonth: (direction: -1 | 0 | 1) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEventComposer, setShowEventComposer] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    type: "PERSONAL",
    startAt: toDateTimeLocal(new Date()),
    endAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000))
  });

  function edit(event: CalendarEvent) {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      description: event.description ?? "",
      type: event.type,
      startAt: toDateTimeLocal(new Date(event.startAt)),
      endAt: toDateTimeLocal(new Date(event.endAt))
    });
    setShowEventComposer(true);
  }

  function reset() {
    setEditingId(null);
    setDraft({ title: "", description: "", type: "PERSONAL", startAt: toDateTimeLocal(new Date()), endAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)) });
    setShowEventComposer(false);
  }

  async function save() {
    const payload = {
      ...draft,
      startAt: fromDateTimeLocal(draft.startAt),
      endAt: fromDateTimeLocal(draft.endAt)
    };
    await guarded(
      () => api(editingId ? `/calendar/${editingId}` : "/calendar", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }).then(() => reset()),
      editingId ? "Event updated." : "Event added."
    );
  }

  return (
    <View style={styles.stack}>
      <View style={[styles.monthNavigator, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <IconButton palette={palette} icon="chevron-back-outline" label="Previous month" onPress={() => void changeMonth(-1)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Return to current month" onPress={() => void changeMonth(0)} style={styles.monthLabel}>
          <Text style={[styles.itemTitle, { color: palette.text }]}>{formatMonthKey(month)}</Text>
          <Text style={[styles.itemMeta, { color: palette.muted }]}>{month === currentMonthKey() ? "Current month" : "Tap for current month"}</Text>
        </Pressable>
        <IconButton palette={palette} icon="chevron-forward-outline" label="Next month" onPress={() => void changeMonth(1)} />
      </View>
      {!showEventComposer && <Button palette={palette} icon="add-outline" label="Add event" onPress={() => setShowEventComposer(true)} />}
      {showEventComposer && <Card palette={palette}>
        <SectionTitle palette={palette} title={editingId ? "Edit event" : "Add event"} />
        <Input palette={palette} label="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
        <OptionChips palette={palette} label="Type" value={draft.type} options={[...calendarEventTypes]} onChange={(type) => setDraft({ ...draft, type })} />
        <DateTimeField palette={palette} label="Starts" value={draft.startAt} onChange={(startAt) => setDraft({ ...draft, startAt })} />
        <DateTimeField palette={palette} label="Ends" value={draft.endAt} onChange={(endAt) => setDraft({ ...draft, endAt })} />
        <Input palette={palette} label="Description" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
        <Button palette={palette} icon="calendar-outline" label={editingId ? "Save event" : "Add event"} onPress={() => void save()} disabled={!draft.title.trim()} />
        <GhostButton palette={palette} label={editingId ? "Cancel edit" : "Close"} onPress={reset} />
      </Card>}
      <Card palette={palette}>
        <SectionTitle palette={palette} title="This month" />
        {events.length === 0 ? (
          <Empty palette={palette} icon="calendar-outline" title="No events this month" body="Add an event to build your schedule." />
        ) : (
          events.map((event) => (
            <View key={event.id} style={[styles.listItem, { borderColor: palette.border, backgroundColor: palette.soft }]}>
              <Text style={[styles.itemTitle, { color: palette.text }]}>{event.title}</Text>
              <Text style={[styles.itemMeta, { color: palette.muted }]}>{formatDate(event.startAt)} - {event.type}</Text>
              {!!event.description && <Text style={[styles.body, { color: palette.muted }]}>{event.description}</Text>}
              <View style={styles.row}>
                <SmallButton palette={palette} label="Edit" icon="create-outline" onPress={() => edit(event)} />
                <SmallButton palette={palette} label="Delete" icon="trash-outline" danger onPress={() => Alert.alert("Delete event?", event.title, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void guarded(() => api(`/calendar/${event.id}`, { method: "DELETE" }), "Event deleted.") }])} />
              </View>
            </View>
          ))
        )}
        {hasMore && (
          <GhostButton palette={palette} label="Load more events" onPress={() => void loadMore()} />
        )}
      </Card>
    </View>
  );
}
