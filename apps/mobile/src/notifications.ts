import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { CalendarEvent, Task } from "./types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

const channelId = "planora-reminders";

export async function getNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission() {
  if (Device.isDevice) {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Planora reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: "#f97316"
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleDailyBrief(hour = 9, minute = 0, privateContent = false) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Notifications.cancelScheduledNotificationAsync("planora-daily-brief").catch((error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!message.includes("not found")) throw error;
  });
  await Notifications.scheduleNotificationAsync({
    identifier: "planora-daily-brief",
    content: {
      title: "Planora check-in",
      body: privateContent ? "Open Planora for today's private check-in." : "A tiny plan for today: food, movement, people, and one useful task.",
      data: { screen: "Dashboard" }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId
    }
  });
  return true;
}

export async function syncPlanoraNotifications(tasks: Task[], events: CalendarEvent[], privateContent = false) {
  const granted = await getNotificationPermission();
  if (!granted) return false;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await cancelMatchingNotifications(
    scheduled.filter((item) => String(item.identifier).startsWith("planora-task-") || String(item.identifier).startsWith("planora-event-"))
  );

  const now = Date.now();
  const upcomingTasks = tasks
    .filter((task) => task.status !== "COMPLETED" && task.dueDate && new Date(task.dueDate).getTime() > now)
    .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime())
    .slice(0, 10);
  const upcomingEvents = events
    .filter((event) => new Date(event.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 10);

  await Promise.all([
    ...upcomingTasks.map((task) =>
      Notifications.scheduleNotificationAsync({
        identifier: `planora-task-${task.id}`,
        content: {
          title: "Task coming up",
          body: privateContent ? "Open Planora to view the task." : task.title,
          data: { screen: "Tasks", id: task.id }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Math.max(now + 60_000, new Date(task.dueDate ?? now).getTime() - 30 * 60_000)),
          channelId
        }
      })
    ),
    ...upcomingEvents.map((event) =>
      Notifications.scheduleNotificationAsync({
        identifier: `planora-event-${event.id}`,
        content: {
          title: "Calendar reminder",
          body: privateContent ? "Open Planora to view the event." : event.title,
          data: { screen: "Calendar", id: event.id }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Math.max(now + 60_000, new Date(event.startAt).getTime() - 30 * 60_000)),
          channelId
        }
      })
    )
  ]);
  return true;
}

export async function cancelPlanoraNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await cancelMatchingNotifications(scheduled.filter((item) => String(item.identifier).startsWith("planora-")));
}

async function cancelMatchingNotifications(notifications: Notifications.NotificationRequest[]) {
  const results = await Promise.allSettled(
    notifications.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Planora could not clear every scheduled notification. Check your device notification settings.");
  }
}
