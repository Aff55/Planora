import { useState } from "react";
import {
  Alert,
  View
} from "react-native";
import { taskPriorities, taskCategories, taskStatuses, recurringRules } from "@planora/shared";
import { fromDateTimeLocal, toDateTimeLocal } from "../api";
import type { Task } from "../types";
import { colors } from "../theme";
import { Card, SectionTitle, Input, DateTimeField, Button, GhostButton, OptionChips, TaskRow, Empty } from "../ui";
import { styles } from "../styles";

export function TasksScreen({
  palette,
  tasks,
  api,
  guarded,
  hasMore,
  loadMore
}: {
  palette: ReturnType<typeof colors>;
  tasks: Task[];
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    notes: "",
    priority: "MEDIUM",
    status: "TODO",
    category: "OTHER",
    dueDate: "",
    progress: "0",
    recurringRule: "",
    subtasks: ""
  });

  const filtered = tasks.filter((task) => {
    const matchesSearch = !search || `${task.title} ${task.description ?? ""} ${task.notes ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || task.status === status;
    const matchesCategory = !category || task.category === category;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  function edit(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      notes: task.notes ?? "",
      priority: task.priority,
      status: task.status,
      category: task.category,
      dueDate: task.dueDate ? toDateTimeLocal(new Date(task.dueDate)) : "",
      progress: String(task.progress),
      recurringRule: task.recurringRule ?? "",
      subtasks: task.subtasks?.map((subtask) => subtask.title).join(", ") ?? ""
    });
    setShowDetails(true);
    setShowTaskComposer(true);
  }

  function reset() {
    setEditingId(null);
    setDraft({ title: "", description: "", notes: "", priority: "MEDIUM", status: "TODO", category: "OTHER", dueDate: "", progress: "0", recurringRule: "", subtasks: "" });
    setShowDetails(false);
    setShowTaskComposer(false);
  }

  async function save() {
    const payload = {
      ...draft,
      dueDate: fromDateTimeLocal(draft.dueDate),
      progress: Number(draft.progress || 0),
      recurringRule: draft.recurringRule || undefined,
      subtasks: draft.subtasks
        .split(",")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title, order) => ({ title, completed: false, order }))
    };
    await guarded(
      () => api(editingId ? `/tasks/${editingId}` : "/tasks", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }).then(() => reset()),
      editingId ? "Task updated." : "Task created."
    );
  }

  return (
    <View style={styles.stack}>
      {!showTaskComposer && <Button palette={palette} icon="add-outline" label="Add task" onPress={() => setShowTaskComposer(true)} />}
      {showTaskComposer && <Card palette={palette}>
        <SectionTitle palette={palette} title={editingId ? "Edit task" : "Create task"} />
        <Input palette={palette} label="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} placeholder="What needs to happen?" />
        <OptionChips palette={palette} label="Priority" value={draft.priority} options={[...taskPriorities]} onChange={(priority) => setDraft({ ...draft, priority })} />
        <OptionChips palette={palette} label="Category" value={draft.category} options={[...taskCategories]} onChange={(nextCategory) => setDraft({ ...draft, category: nextCategory })} />
        <DateTimeField palette={palette} label="Due" value={draft.dueDate} onChange={(dueDate) => setDraft({ ...draft, dueDate })} allowClear />
        <GhostButton palette={palette} label={showDetails ? "Hide details" : "Add details"} onPress={() => setShowDetails(!showDetails)} />
        {showDetails && (
          <View style={styles.stack}>
            <OptionChips palette={palette} label="Status" value={draft.status} options={[...taskStatuses]} onChange={(nextStatus) => setDraft({ ...draft, status: nextStatus })} />
            <Input palette={palette} label="Description" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
            <Input palette={palette} label="Notes" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })} multiline />
            <Input palette={palette} label="Progress" value={draft.progress} onChangeText={(progress) => setDraft({ ...draft, progress })} keyboardType="number-pad" />
            <OptionChips palette={palette} label="Repeat" value={draft.recurringRule} options={["", ...recurringRules]} labels={{ "": "Never" }} onChange={(recurringRule) => setDraft({ ...draft, recurringRule })} />
            <Input palette={palette} label="Subtasks" value={draft.subtasks} onChangeText={(subtasks) => setDraft({ ...draft, subtasks })} placeholder="Comma separated" />
          </View>
        )}
        <Button palette={palette} icon="save-outline" label={editingId ? "Save task" : "Create task"} onPress={() => void save()} disabled={!draft.title.trim()} />
        {editingId && <GhostButton palette={palette} label="Cancel edit" onPress={reset} />}
      </Card>}

      <Card palette={palette}>
        <SectionTitle palette={palette} title="Task list" />
        <Input palette={palette} label="Search" value={search} onChangeText={setSearch} placeholder="Search tasks" />
        <OptionChips palette={palette} label="Status" value={status} options={["", ...taskStatuses]} labels={{ "": "All" }} onChange={setStatus} />
        <OptionChips palette={palette} label="Category" value={category} options={["", ...taskCategories]} labels={{ "": "All" }} onChange={setCategory} />
        {filtered.length === 0 ? (
          <Empty palette={palette} icon="filter-outline" title="No tasks found" body="Create a task or adjust filters." />
        ) : (
          filtered.map((task) => (
            <TaskRow
              key={task.id}
              palette={palette}
              task={task}
              onDone={() => void guarded(() => api(`/tasks/${task.id}/complete`, { method: "PATCH", body: JSON.stringify({ completed: task.status !== "COMPLETED" }) }), task.status === "COMPLETED" ? "Task reopened." : "Task completed.")}
              onEdit={() => edit(task)}
              onDelete={() => Alert.alert("Delete task?", task.title, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void guarded(() => api(`/tasks/${task.id}`, { method: "DELETE" }), "Task deleted.") }])}
            />
          ))
        )}
        {hasMore && (
          <GhostButton palette={palette} label="Load more tasks" onPress={() => void loadMore()} />
        )}
      </Card>
    </View>
  );
}
