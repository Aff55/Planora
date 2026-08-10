"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, GripVertical, ListChecks, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { recurringRules, taskCategories, taskPriorities, taskStatuses } from "@planora/shared";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Section } from "../../../components/ui/surfaces";
import { Button, Field, IconButton, Segmented, Select, inputClass, textareaClass } from "../../../components/ui/controls";
import { Banner, EmptyState, SkeletonRows } from "../../../components/ui/feedback";
import { ApiError, apiRequest, toMessage } from "../../../lib/api";
import { formatDateTime, fromDateTimeLocal, isOverdue, label as toLabel, relativeDay, toDateTimeLocal } from "../../../lib/format";
import { useMessages } from "../../../lib/messages";
import type { PageInfo, Task, TaskCategory, TaskStatus } from "../../../lib/types";

/**
 * Tasks.
 *
 * Capture is one line and always reachable; priority, dates, subtasks and
 * recurrence are behind a disclosure, because the common case is writing down
 * a thought before it evaporates. Completion is optimistic and reconciles —
 * and rolls back visibly if the server refuses.
 */

const PAGE_LIMIT = 40;

type Draft = {
  title: string;
  description: string;
  notes: string;
  priority: string;
  status: string;
  category: string;
  dueDate: string;
  progress: number;
  color: string;
  recurringRule: string;
  subtasks: string;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  notes: "",
  priority: "MEDIUM",
  status: "TODO",
  category: "OTHER",
  dueDate: "",
  progress: 0,
  color: "",
  recurringRule: "",
  subtasks: ""
};

const statusFilters = [{ value: "" as const, label: "All" }, ...taskStatuses.map((value) => ({ value, label: toLabel(value) }))];

export default function TasksPage() {
  const { guard, fail } = useMessages();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasMore: false, nextCursor: null, limit: PAGE_LIMIT });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [category, setCategory] = useState<TaskCategory | "">("");

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    params.set("limit", String(PAGE_LIMIT));
    return params.toString();
  }, [debouncedSearch, status, category]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const data = await apiRequest<{ tasks: Task[]; pageInfo: PageInfo }>(`/tasks?${queryString}`, { signal });
        if (signal?.aborted) return;
        setTasks(data.tasks);
        setPageInfo(data.pageInfo);
        setLoadError(null);
      } catch (cause) {
        if (signal?.aborted) return;
        setLoadError(toMessage(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function loadMore() {
    if (!pageInfo.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiRequest<{ tasks: Task[]; pageInfo: PageInfo }>(
        `/tasks?${queryString}&cursor=${encodeURIComponent(pageInfo.nextCursor)}`
      );
      setTasks((current) => [...current, ...data.tasks]);
      setPageInfo(data.pageInfo);
    } catch (cause) {
      fail(cause);
    } finally {
      setLoadingMore(false);
    }
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId(null);
    setDetailOpen(false);
    setFieldErrors({});
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      notes: task.notes ?? "",
      priority: task.priority,
      status: task.status,
      category: task.category,
      dueDate: task.dueDate ? toDateTimeLocal(new Date(task.dueDate)) : "",
      progress: task.progress,
      color: task.color ?? "",
      recurringRule: task.recurringRule ?? "",
      subtasks: (task.subtasks ?? []).map((subtask) => subtask.title).join(", ")
    });
    setDetailOpen(true);
    setFieldErrors({});
    titleRef.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;

    setSaving(true);
    setFieldErrors({});

    const payload = {
      title,
      description: draft.description.trim() || null,
      notes: draft.notes.trim() || null,
      priority: draft.priority,
      status: draft.status,
      category: draft.category,
      dueDate: draft.dueDate ? fromDateTimeLocal(draft.dueDate) : null,
      progress: Number(draft.progress),
      color: draft.color.trim() || null,
      recurringRule: draft.recurringRule || null,
      subtasks: draft.subtasks
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value, order) => ({ title: value, completed: false, order }))
    };

    try {
      if (editingId) {
        await apiRequest(`/tasks/${editingId}`, { method: "PUT", body: payload });
      } else {
        await apiRequest("/tasks", { method: "POST", body: payload });
      }
      resetDraft();
      await load();
    } catch (cause) {
      if (cause instanceof ApiError && cause.details.length > 0) {
        const issues: Record<string, string> = {};
        for (const issue of cause.details) issues[issue.path] = issue.message;
        setFieldErrors(issues);
      }
      fail(cause);
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(task: Task) {
    const completed = task.status !== "COMPLETED";
    const previous = tasks;
    // Flip locally so the tap lands immediately.
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status: completed ? "COMPLETED" : "TODO" } : item))
    );
    const ok = await guard(async () => {
      await apiRequest(`/tasks/${task.id}/complete`, { method: "PATCH", body: { completed } });
      await load();
    });
    if (!ok) setTasks(previous);
  }

  async function remove(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    await guard(async () => {
      await apiRequest(`/tasks/${task.id}`, { method: "DELETE" });
      await load();
    }, "Task deleted.");
  }

  /**
   * Drag to reorder. Sends the whole visible order to `POST /tasks/reorder`,
   * which assigns `order` by index. The server still sorts by status first, so
   * this positions a task within its status group rather than above a
   * completed one — which is the behaviour the list already implies.
   */
  async function reorderTo(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    const from = tasks.findIndex((task) => task.id === draggingId);
    const to = tasks.findIndex((task) => task.id === targetId);
    if (from === -1 || to === -1) return;

    const previous = tasks;
    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setTasks(next);
    setDraggingId(null);

    const ok = await guard(async () => {
      await apiRequest("/tasks/reorder", { method: "POST", body: { orderedIds: next.map((task) => task.id) } });
    });
    if (!ok) setTasks(previous);
  }

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="Tasks"
        description="Write the next thing down in one line. Add detail only when it earns its place."
      />

      <div className="space-y-8">
        <Section title={editingId ? "Edit task" : "Add a task"}>
          <Group>
            <form onSubmit={submit}>
              <div className="flex items-center gap-3 p-4">
                <input
                  ref={titleRef}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="What needs to happen?"
                  aria-label="Task title"
                  aria-invalid={Boolean(fieldErrors.title) || undefined}
                  className="min-h-touch w-full min-w-0 bg-transparent text-body outline-none placeholder:text-muted"
                  maxLength={180}
                />
                <Button type="submit" disabled={saving || !draft.title.trim()} className="shrink-0 px-4">
                  {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                  <span className="hidden sm:inline">{editingId ? "Save" : "Add"}</span>
                </Button>
              </div>

              {fieldErrors.title && (
                <p className="px-4 pb-2 text-footnote font-medium text-critical">{fieldErrors.title}</p>
              )}

              <button
                type="button"
                aria-expanded={detailOpen}
                onClick={() => setDetailOpen((open) => !open)}
                className="focus-ring flex min-h-touch w-full items-center justify-between px-4 text-footnote font-semibold text-accent-text transition hover:bg-sunken"
              >
                {detailOpen ? "Hide detail" : "Add detail"}
                <ChevronDown className={clsx("size-4 transition-transform", detailOpen && "rotate-180")} aria-hidden="true" />
              </button>

              {detailOpen && (
                <div className="enter-row space-y-5 border-t border-hairline p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Due" error={fieldErrors.dueDate}>
                      {({ id, describedBy, invalid }) => (
                        <input
                          id={id}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                          className={inputClass}
                          type="datetime-local"
                          value={draft.dueDate}
                          onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                        />
                      )}
                    </Field>
                    <Field label="Priority">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={draft.priority}
                          onChange={(value) => setDraft({ ...draft, priority: value })}
                          options={taskPriorities.map((value) => ({ value, label: toLabel(value) }))}
                        />
                      )}
                    </Field>
                    <Field label="Category">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={draft.category}
                          onChange={(value) => setDraft({ ...draft, category: value })}
                          options={taskCategories.map((value) => ({ value, label: toLabel(value) }))}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Status">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={draft.status}
                          onChange={(value) => setDraft({ ...draft, status: value })}
                          options={taskStatuses.map((value) => ({ value, label: toLabel(value) }))}
                        />
                      )}
                    </Field>
                    <Field label="Repeat">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={draft.recurringRule}
                          includeEmpty="Never"
                          onChange={(value) => setDraft({ ...draft, recurringRule: value })}
                          options={recurringRules.map((value) => ({ value, label: toLabel(value) }))}
                        />
                      )}
                    </Field>
                    <Field label="Progress" hint="Percent complete." error={fieldErrors.progress}>
                      {({ id, describedBy, invalid }) => (
                        <input
                          id={id}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                          className={inputClass}
                          type="number"
                          min={0}
                          max={100}
                          value={draft.progress}
                          onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })}
                        />
                      )}
                    </Field>
                  </div>

                  <Field label="Subtasks" hint="Comma separated for quick entry." error={fieldErrors.subtasks}>
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        className={inputClass}
                        value={draft.subtasks}
                        onChange={(event) => setDraft({ ...draft, subtasks: event.target.value })}
                        placeholder="Draft outline, add screenshots"
                      />
                    )}
                  </Field>

                  <Field label="Description" error={fieldErrors.description}>
                    {({ id, describedBy, invalid }) => (
                      <textarea
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        className={textareaClass}
                        value={draft.description}
                        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      />
                    )}
                  </Field>

                  <Field label="Notes" error={fieldErrors.notes}>
                    {({ id, describedBy, invalid }) => (
                      <textarea
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        className={textareaClass}
                        value={draft.notes}
                        onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                      />
                    )}
                  </Field>

                  {editingId && (
                    <Button variant="ghost" onClick={resetDraft}>
                      <X className="size-4" aria-hidden="true" />
                      Cancel edit
                    </Button>
                  )}
                </div>
              )}
            </form>
          </Group>
        </Section>

        <Section title="Filter">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  className={clsx(inputClass, "pl-10")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles, descriptions and notes"
                  aria-label="Search tasks"
                  type="search"
                />
              </div>
              <Select
                className="sm:w-48"
                value={category}
                includeEmpty="All categories"
                onChange={(value) => setCategory(value as TaskCategory | "")}
                options={taskCategories.map((value) => ({ value, label: toLabel(value) }))}
              />
            </div>
            <Segmented
              label="Filter by status"
              value={status}
              onChange={(value) => setStatus(value)}
              options={statusFilters}
            />
          </div>
        </Section>

        <Section title={loading ? "Tasks" : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`}>
          {loadError ? (
            <Banner tone="error">{loadError}</Banner>
          ) : loading ? (
            <SkeletonRows rows={5} />
          ) : tasks.length === 0 ? (
            <Group>
              <EmptyState
                icon={ListChecks}
                title={debouncedSearch || status || category ? "Nothing matches those filters" : "No tasks yet"}
                body={
                  debouncedSearch || status || category
                    ? "Try a broader filter, or clear the search."
                    : "Add the first one above. One line is enough."
                }
              />
            </Group>
          ) : (
            <>
              <Group className="stagger">
                {tasks.map((task) => {
                  const done = task.status === "COMPLETED";
                  const overdue = !done && isOverdue(task.dueDate);
                  const relative = relativeDay(task.dueDate);
                  return (
                    <div
                      key={task.id}
                      onDragOver={(event) => {
                        if (draggingId) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        void reorderTo(task.id);
                      }}
                      className={clsx(
                        "enter-row flex items-start gap-3 px-5 py-4 transition-colors",
                        draggingId === task.id && "opacity-50",
                        draggingId && draggingId !== task.id && "hover:bg-sunken"
                      )}
                    >
                      <span
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", task.id);
                          setDraggingId(task.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        aria-hidden="true"
                        title="Drag to reorder"
                        className="mt-1 cursor-grab text-muted active:cursor-grabbing"
                      >
                        <GripVertical className="size-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleComplete(task)}
                        aria-pressed={done}
                        aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" complete`}
                        className={clsx(
                          "focus-ring mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition duration-state active:scale-90",
                          done ? "border-positive bg-positive text-white" : "border-line text-transparent hover:border-positive hover:text-positive"
                        )}
                      >
                        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={clsx("break-words text-callout font-medium", done && "text-muted line-through")}>
                          {task.title}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-footnote text-muted">
                          <span className={clsx(overdue && "font-semibold text-critical")}>
                            {task.dueDate ? relative ?? formatDateTime(task.dueDate) : "No due date"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{toLabel(task.priority)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{toLabel(task.category)}</span>
                          {task.recurringRule && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Repeats {task.recurringRule.toLowerCase()}</span>
                            </>
                          )}
                          {task.progress > 0 && task.progress < 100 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular">{task.progress}%</span>
                            </>
                          )}
                        </p>
                        {task.description && (
                          <p className="mt-2 break-words text-footnote leading-relaxed text-muted">{task.description}</p>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {task.subtasks.map((subtask) => (
                              <li
                                key={subtask.id}
                                className={clsx(
                                  "rounded-sm px-2 py-1 text-micro tracking-normal",
                                  subtask.completed ? "bg-positive-wash text-positive" : "bg-sunken text-muted"
                                )}
                              >
                                {subtask.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <IconButton icon={Pencil} label={`Edit "${task.title}"`} variant="ghost" onClick={() => startEdit(task)} />
                        <IconButton icon={Trash2} label={`Delete "${task.title}"`} variant="ghost" onClick={() => void remove(task)} />
                      </div>
                    </div>
                  );
                })}
              </Group>

              {pageInfo.hasMore && (
                <div className="mt-4 flex justify-center">
                  <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
                    {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {loadingMore ? "Loading" : "Load more tasks"}
                  </Button>
                </div>
              )}
            </>
          )}
        </Section>
      </div>
    </>
  );
}
