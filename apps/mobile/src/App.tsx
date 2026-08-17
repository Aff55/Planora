import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View
} from "react-native";
import { apiRequest, currentMonthKey, defaultApiUrl, normalizeApiUrl, showDevTools } from "./api";
import { cancelPlanoraNotifications, getNotificationPermission, notificationsSupported, scheduleDailyBrief, syncPlanoraNotifications } from "./notifications";
import type { ActivityEntry, AIHistoryItem, CalendarEvent, CompanionContext, CompanionStatus, CurrentUser, DashboardData, AdaptiveRankerStatus, PageInfo, PersonalProfile, Recommendation, SettingsShape, Task, WellbeingSummary } from "./types";
import { ScreenName, tokenKey, pendingLogoutTokenKey, apiUrlKey, themeKey, defaultSettings, notificationScreens, defaultPersonalProfile, colors } from "./theme";
import { resolveDark, shiftMonthKey } from "./utils";
import { AppFrame, TabBar, IconButton, Notice, FadeIn } from "./ui";
import { styles } from "./styles";
import { AuthScreen } from "./screens/AuthScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { LifeScreen } from "./screens/LifeScreen";
import { WellbeingScreen } from "./screens/WellbeingScreen";
import { CompanionScreen } from "./screens/CompanionScreen";
import { FocusScreen } from "./screens/FocusScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

export default function App() {
  const systemColorScheme = useColorScheme();
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [screen, setScreen] = useState<ScreenName>("Dashboard");
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey());
  const [taskPageInfo, setTaskPageInfo] = useState<PageInfo>({ hasMore: false, nextCursor: null, limit: 100 });
  const [eventPageInfo, setEventPageInfo] = useState<PageInfo>({ hasMore: false, nextCursor: null, limit: 100 });
  const [activitiesToday, setActivitiesToday] = useState<ActivityEntry[]>([]);
  const [activitiesRecent, setActivitiesRecent] = useState<ActivityEntry[]>([]);
  const [wellbeing, setWellbeing] = useState<WellbeingSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [ranker, setRanker] = useState<AdaptiveRankerStatus | null>(null);
  const [profile, setProfile] = useState<PersonalProfile>(defaultPersonalProfile);
  const [companionStatus, setCompanionStatus] = useState<CompanionStatus | null>(null);
  const [companionContext, setCompanionContext] = useState<CompanionContext | null>(null);
  const [history, setHistory] = useState<AIHistoryItem[]>([]);
  const palette = useMemo(() => colors(dark), [dark]);

  const api = useCallback(
    <T,>(path: string, options: RequestInit = {}) =>
      apiRequest<T>(apiUrl, path, { ...options, token, ...(path === "/companion/chat" ? { timeoutMs: 70_000 } : {}) }),
    [apiUrl, token]
  );

  /**
   * Deliberately a function declaration rather than a `useCallback`.
   *
   * It is only ever called - it appears in no dependency array - so the
   * memoisation bought nothing, and routing it through a hook made it depend on
   * hook state resolving correctly. On an older Expo Go it did not: the binding
   * read back as `undefined`, so the initial load silently did nothing and pull
   * to refresh threw "loadEverything is not a function".
   *
   * A function declaration is hoisted to the top of the component, so it exists
   * for every closure in this scope regardless of render or hook behaviour.
   * The defaults still read the current render's values, which is what the call
   * sites passing explicit arguments rely on.
   */
  async function loadEverything(
    nextToken = token,
    nextApiUrl = apiUrl,
    notificationSettings = user?.settings,
    requestedMonth = calendarMonth
  ) {
    {
      if (!nextToken) return;
      setRefreshing(true);
      setError(null);
      try {
        const month = requestedMonth;
        const [
          nextDashboard,
          nextTasks,
          nextEvents,
          nextActivities,
          nextWellbeing,
          nextRecommendations,
          nextRanker,
          nextProfile,
          nextStatus,
          nextContext,
          nextHistory
        ] = await Promise.all([
          apiRequest<DashboardData>(nextApiUrl, "/dashboard", { token: nextToken }),
          apiRequest<{ tasks: Task[]; pageInfo: PageInfo }>(nextApiUrl, "/tasks?limit=100", { token: nextToken }),
          apiRequest<{ events: CalendarEvent[]; pageInfo: PageInfo }>(nextApiUrl, `/calendar?month=${month}&limit=100`, { token: nextToken }),
          apiRequest<{ today: ActivityEntry[]; recent: ActivityEntry[] }>(nextApiUrl, "/activities", { token: nextToken }),
          apiRequest<WellbeingSummary>(nextApiUrl, "/wellbeing/summary", { token: nextToken }),
          apiRequest<{ recommendations: Recommendation[] }>(nextApiUrl, "/recommendations", { token: nextToken }),
          apiRequest<{ status: AdaptiveRankerStatus }>(nextApiUrl, "/ranker/status", { token: nextToken }),
          apiRequest<{ profile: PersonalProfile | null }>(nextApiUrl, "/profile", { token: nextToken }),
          apiRequest<CompanionStatus>(nextApiUrl, "/companion/status", { token: nextToken }),
          apiRequest<{ context: CompanionContext | null }>(nextApiUrl, "/companion/context", { token: nextToken }),
          apiRequest<{ history: AIHistoryItem[] }>(nextApiUrl, "/companion/history", { token: nextToken })
        ]);
        setDashboard(nextDashboard);
        setTasks(nextTasks.tasks);
        setTaskPageInfo(nextTasks.pageInfo);
        setEvents(nextEvents.events);
        setEventPageInfo(nextEvents.pageInfo);
        setActivitiesToday(nextActivities.today);
        setActivitiesRecent(nextActivities.recent);
        setWellbeing(nextWellbeing);
        setRecommendations(nextRecommendations.recommendations);
        setRanker(nextRanker.status);
        setProfile({ ...defaultPersonalProfile, ...(nextProfile.profile ?? {}) });
        setCompanionStatus(nextStatus);
        setCompanionContext(nextContext.context);
        setHistory(nextHistory.history);
        if (notificationSettings?.notificationPush && (await getNotificationPermission())) {
          const reminderMonths = [currentMonthKey(), shiftMonthKey(currentMonthKey(), 1)];
          const reminderEvents = (
            await Promise.all(
              reminderMonths.map(async (reminderMonth) =>
                reminderMonth === month
                  ? nextEvents.events
                  : (
                      await apiRequest<{ events: CalendarEvent[] }>(nextApiUrl, `/calendar?month=${reminderMonth}&limit=100`, {
                        token: nextToken
                      })
                    ).events
              )
            )
          ).flat();
          await syncPlanoraNotifications(nextTasks.tasks, reminderEvents, notificationSettings.privacyMode);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load Planora");
      } finally {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      const target = response?.notification.request.content.data?.screen;
      if (typeof target === "string" && notificationScreens.has(target as ScreenName)) {
        setScreen(target as ScreenName);
      }
    };

    // Expo Go has no notification native module, so these throw there. Deep
    // linking from a notification simply does not apply in that host.
    if (!notificationsSupported) return;
    void Notifications.getLastNotificationResponseAsync().then(openNotification);
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if ((user?.settings?.theme ?? "SYSTEM") === "SYSTEM") {
      setDark(systemColorScheme === "dark");
    }
  }, [systemColorScheme, user?.settings?.theme]);

  useEffect(() => {
    async function restore() {
      const [storedToken, pendingLogoutToken, storedApiUrl, storedTheme] = await Promise.all([
        SecureStore.getItemAsync(tokenKey),
        SecureStore.getItemAsync(pendingLogoutTokenKey),
        AsyncStorage.getItem(apiUrlKey),
        AsyncStorage.getItem(themeKey)
      ]);
      // Gated on showDevTools rather than __DEV__ so that a URL saved once
      // during development cannot silently outrank EXPO_PUBLIC_API_URL later.
      // That override is invisible from the UI when the dev card is hidden, so
      // the app would just fail to reach the server with no explanation.
      const resolvedApiUrl = showDevTools && storedApiUrl ? storedApiUrl : defaultApiUrl;
      setApiUrl(resolvedApiUrl);
      if (storedTheme === "DARK") setDark(true);
      if (pendingLogoutToken) {
        try {
          await apiRequest(resolvedApiUrl, "/auth/logout", { method: "POST", token: pendingLogoutToken });
          await SecureStore.deleteItemAsync(pendingLogoutTokenKey);
        } catch {
          // Keep the isolated token for the next bounded retry; never restore it as an active session.
        }
      }
      if (!storedToken) {
        setBooting(false);
        return;
      }
      try {
        const data = await apiRequest<{ user: CurrentUser }>(resolvedApiUrl, "/auth/me", { token: storedToken });
        setToken(storedToken);
        setUser(data.user);
        setDark(resolveDark(data.user.settings?.theme, storedTheme, systemColorScheme === "dark"));
        await loadEverything(storedToken, resolvedApiUrl, data.user.settings);
      } catch {
        await SecureStore.deleteItemAsync(tokenKey);
        clearAccountState();
      } finally {
        setBooting(false);
      }
    }
    void restore();
  }, []);

  async function saveSession(nextToken: string, nextUser: CurrentUser) {
    const resolvedApiUrl = normalizeApiUrl(apiUrl);
    await SecureStore.setItemAsync(tokenKey, nextToken);
    if (showDevTools) await AsyncStorage.setItem(apiUrlKey, resolvedApiUrl);
    clearAccountState();
    setApiUrl(resolvedApiUrl);
    setToken(nextToken);
    setUser(nextUser);
    setDark(resolveDark(nextUser.settings?.theme, dark ? "DARK" : "LIGHT", systemColorScheme === "dark"));
    setScreen("Dashboard");
    setNotice("Welcome to Planora mobile.");
    await loadEverything(nextToken, resolvedApiUrl, nextUser.settings, currentMonthKey());
  }

  async function logout() {
    if (!token) return;
    let revocationConfirmed = false;
    try {
      await apiRequest(apiUrl, "/auth/logout", { method: "POST", token });
      revocationConfirmed = true;
    } catch {
      await SecureStore.setItemAsync(pendingLogoutTokenKey, token);
    }
    await SecureStore.deleteItemAsync(tokenKey);
    if (revocationConfirmed) await SecureStore.deleteItemAsync(pendingLogoutTokenKey);
    clearAccountState();
    setToken(null);
    setUser(null);
    try {
      await cancelPlanoraNotifications();
    } catch (notificationError) {
      Alert.alert(
        "Check scheduled notifications",
        notificationError instanceof Error ? notificationError.message : "Planora could not clear every scheduled notification."
      );
    }
    if (!revocationConfirmed) {
      Alert.alert(
        "Signed out on this device",
        "Planora could not confirm server revocation. The old session is isolated and will be retried automatically when the API is reachable."
      );
    }
  }

  async function logoutEverywhere() {
    if (!token) return;
    try {
      await apiRequest(apiUrl, "/auth/logout-all", { method: "POST", token });
      await SecureStore.deleteItemAsync(pendingLogoutTokenKey);
    } catch (logoutError) {
      Alert.alert(
        "Could not log out everywhere",
        logoutError instanceof Error ? logoutError.message : "Planora could not reach the server. Try again when you are online."
      );
      return;
    }
    await SecureStore.deleteItemAsync(tokenKey);
    clearAccountState();
    setToken(null);
    setUser(null);
    try {
      await cancelPlanoraNotifications();
    } catch (notificationError) {
      Alert.alert(
        "Check scheduled notifications",
        notificationError instanceof Error ? notificationError.message : "Planora could not clear every scheduled notification."
      );
    }
  }

  function clearAccountState() {
    setDashboard(null);
    setTasks([]);
    setEvents([]);
    setActivitiesToday([]);
    setActivitiesRecent([]);
    setWellbeing(null);
    setRecommendations([]);
    setRanker(null);
    setProfile(defaultPersonalProfile);
    setCompanionStatus(null);
    setCompanionContext(null);
    setHistory([]);
    setCalendarMonth(currentMonthKey());
    setTaskPageInfo({ hasMore: false, nextCursor: null, limit: 100 });
    setEventPageInfo({ hasMore: false, nextCursor: null, limit: 100 });
    setScreen("Dashboard");
  }

  async function loadMoreTasks() {
    if (!token || !taskPageInfo.nextCursor) return;
    const data = await apiRequest<{ tasks: Task[]; pageInfo: PageInfo }>(
      apiUrl,
      `/tasks?limit=100&cursor=${encodeURIComponent(taskPageInfo.nextCursor)}`,
      { token }
    );
    setTasks((current) => [...current, ...data.tasks]);
    setTaskPageInfo(data.pageInfo);
  }

  async function loadMoreEvents() {
    if (!token || !eventPageInfo.nextCursor) return;
    const data = await apiRequest<{ events: CalendarEvent[]; pageInfo: PageInfo }>(
      apiUrl,
      `/calendar?month=${calendarMonth}&limit=100&cursor=${encodeURIComponent(eventPageInfo.nextCursor)}`,
      { token }
    );
    setEvents((current) => [...current, ...data.events]);
    setEventPageInfo(data.pageInfo);
  }

  async function changeCalendarMonth(direction: -1 | 0 | 1) {
    if (!token) return;
    const nextMonth = direction === 0 ? currentMonthKey() : shiftMonthKey(calendarMonth, direction);
    setError(null);
    try {
      const data = await apiRequest<{ events: CalendarEvent[]; pageInfo: PageInfo }>(
        apiUrl,
        `/calendar?month=${nextMonth}&limit=100`,
        { token }
      );
      setCalendarMonth(nextMonth);
      setEvents(data.events);
      setEventPageInfo(data.pageInfo);
    } catch (monthError) {
      setError(monthError instanceof Error ? monthError.message : "Could not load that month");
    }
  }

  async function refreshMe() {
    if (!token) return;
    const data = await api<{ user: CurrentUser }>("/auth/me");
    setUser(data.user);
  }

  async function updateSettings(nextSettings: SettingsShape) {
    if (!token || !user) return;
    if (nextSettings.notificationPush) {
      const enabled = await scheduleDailyBrief(9, 0, nextSettings.privacyMode);
      if (!enabled) throw new Error("Notification permission was not granted.");
    }
    await api("/auth/settings", { method: "PUT", body: JSON.stringify(nextSettings) });
    setUser({ ...user, settings: nextSettings });
    setDark(resolveDark(nextSettings.theme, dark ? "DARK" : "LIGHT", systemColorScheme === "dark"));
    if (nextSettings.notificationPush) {
      await syncPlanoraNotifications(tasks, events, nextSettings.privacyMode);
    } else {
      await cancelPlanoraNotifications();
    }
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    void AsyncStorage.setItem(themeKey, next ? "DARK" : "LIGHT");
    if (user?.settings) {
      void updateSettings({ ...defaultSettings, ...user.settings, theme: next ? "DARK" : "LIGHT" }).catch((themeError) => {
        setError(themeError instanceof Error ? themeError.message : "Could not save theme");
      });
    }
  }

  async function guarded(run: () => Promise<void>, success?: string) {
    setError(null);
    try {
      await run();
      if (success) setNotice(success);
      await loadEverything();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Something went wrong");
    }
  }

  if (booting) {
    return (
      <AppFrame palette={palette} dark={dark}>
        <View style={[styles.centered, styles.centeredInner]}>
          <Image source={require("../assets/icon.png")} style={styles.bootLogo} />
          <Text style={[styles.heroTitle, { color: palette.text, textAlign: "center" }]}>Loading Planora</Text>
          <Text style={[styles.heroBody, { color: palette.muted, textAlign: "center" }]}>Restoring your mobile session.</Text>
        </View>
      </AppFrame>
    );
  }

  if (!token || !user) {
    return (
      <AppFrame palette={palette} dark={dark}>
        <AuthScreen palette={palette} apiUrl={apiUrl} setApiUrl={setApiUrl} saveSession={saveSession} toggleTheme={toggleTheme} dark={dark} />
      </AppFrame>
    );
  }

  return (
    <AppFrame palette={palette} dark={dark}>
      <View style={styles.appHeader}>
        <View style={styles.headerBrand}>
          <Image source={require("../assets/icon.png")} style={styles.headerMark} accessibilityLabel="Planora" />
          <Text numberOfLines={1} style={[styles.screenTitle, { color: palette.text }]}>
            {screen}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton palette={palette} icon={dark ? "sunny-outline" : "moon-outline"} label="Theme" onPress={toggleTheme} />
          <IconButton palette={palette} icon="refresh-outline" label="Refresh" onPress={() => void loadEverything()} />
        </View>
      </View>

      {(notice || error) && (
        <Notice palette={palette} kind={error ? "error" : "success"} message={error ?? notice ?? ""} onClose={() => {
          setError(null);
          setNotice(null);
        }} />
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadEverything()} tintColor={palette.orange} />}
      >
        {/* Keyed on `screen` so switching tabs replays the entry transition. */}
        <FadeIn key={screen}>
        {screen === "Dashboard" && (
          <DashboardScreen palette={palette} data={dashboard} setScreen={setScreen} completeTask={(task) =>
            guarded(() => api(`/tasks/${task.id}/complete`, { method: "PATCH", body: JSON.stringify({ completed: true }) }), "Task completed.")
          } feedback={(id, action) =>
            guarded(() => api(`/recommendations/${id}/feedback`, { method: "POST", body: JSON.stringify({ action }) }), "Recommendation updated.")
          } />
        )}
        {screen === "Tasks" && (
          <TasksScreen
            palette={palette}
            tasks={tasks}
            api={api}
            guarded={guarded}
            hasMore={taskPageInfo.hasMore}
            loadMore={loadMoreTasks}
          />
        )}
        {screen === "Calendar" && (
          <CalendarScreen
            palette={palette}
            events={events}
            api={api}
            guarded={guarded}
            hasMore={eventPageInfo.hasMore}
            loadMore={loadMoreEvents}
            month={calendarMonth}
            changeMonth={changeCalendarMonth}
          />
        )}
        {screen === "Life" && <LifeScreen palette={palette} today={activitiesToday} recent={activitiesRecent} api={api} guarded={guarded} />}
        {screen === "Wellbeing" && <WellbeingScreen palette={palette} summary={wellbeing} api={api} guarded={guarded} />}
        {screen === "Companion" && (
          <CompanionScreen
            palette={palette}
            history={history}
            status={companionStatus}
            context={companionContext}
            personalizationEnabled={user.settings?.aiPersonalization ?? true}
            api={api}
            guarded={guarded}
          />
        )}
        {screen === "Insights" && <InsightsScreen palette={palette} recommendations={recommendations} ranker={ranker} api={api} guarded={guarded} />}
        {screen === "Focus" && (
          <FocusScreen
            palette={palette}
            data={dashboard}
            completeTask={(task) =>
              guarded(
                () => api(`/tasks/${task.id}/complete`, { method: "PATCH", body: JSON.stringify({ completed: true }) }),
                "Task completed."
              )
            }
          />
        )}
        {screen === "Reports" && (
          <ReportsScreen palette={palette} data={dashboard} wellbeing={wellbeing} ranker={ranker} api={api} />
        )}
        {screen === "Search" && <SearchScreen palette={palette} api={api} setScreen={setScreen} />}
        {screen === "More" && <MoreScreen palette={palette} setScreen={setScreen} />}
        {screen === "Profile" && <ProfileScreen palette={palette} profile={profile} api={api} guarded={guarded} />}
        {screen === "Settings" && (
          <SettingsScreen
            palette={palette}
            user={user}
            token={token}
            apiUrl={apiUrl}
            setApiUrl={setApiUrl}
            refreshMe={refreshMe}
            updateSettings={updateSettings}
            api={api}
            guarded={guarded}
            logout={logout}
            logoutEverywhere={logoutEverywhere}
          />
        )}
        </FadeIn>
      </ScrollView>

      <TabBar palette={palette} active={screen} setScreen={setScreen} />
    </AppFrame>
  );
}
