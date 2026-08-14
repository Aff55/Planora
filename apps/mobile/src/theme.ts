import type { IconName } from "./icon";
import type { PersonalProfile, SettingsShape } from "./types";

export type { IconName };
export type ScreenName =
  | "Dashboard"
  | "Tasks"
  | "Calendar"
  | "Life"
  | "Wellbeing"
  | "Companion"
  | "Insights"
  | "Focus"
  | "Reports"
  | "Search"
  | "Profile"
  | "Settings"
  | "More";

export const tokenKey = "planora_mobile_token";
export const pendingLogoutTokenKey = "planora_mobile_pending_logout_token";
export const apiUrlKey = "planora_mobile_api_url";
export const themeKey = "planora_mobile_theme";

export const defaultSettings: SettingsShape = {
  theme: "SYSTEM",
  notificationEmail: false,
  notificationPush: false,
  privacyMode: false,
  aiPersonalization: true,
  exportFormat: "JSON"
};

/**
 * `label` exists separately from `name` because the screen identifier and the
 * word under the icon have different constraints. Five tabs on a 390pt phone
 * leaves roughly 76pt each, and "Dashboard" and "Companion" do not fit at a
 * legible size - they wrapped or shrank out of step with their neighbours.
 * Short labels let the icons carry the meaning and stay large.
 */
export const tabs: Array<{ name: ScreenName; label: string; icon: IconName }> = [
  { name: "Dashboard", label: "Today", icon: "home-outline" },
  { name: "Tasks", label: "Tasks", icon: "checkbox-outline" },
  { name: "Life", label: "Life", icon: "walk-outline" },
  { name: "Companion", label: "Chat", icon: "chatbubble-ellipses-outline" },
  { name: "More", label: "More", icon: "grid-outline" }
];

export const secondaryScreens: Array<{ name: ScreenName; icon: IconName; body: string }> = [
  { name: "Calendar", icon: "calendar-outline", body: "Events and reminders" },
  { name: "Wellbeing", icon: "heart-outline", body: "Mood, sleep, water, journal" },
  { name: "Focus", icon: "flag-outline", body: "One task, nothing else" },
  { name: "Insights", icon: "analytics-outline", body: "Recommendations and learning" },
  { name: "Reports", icon: "document-text-outline", body: "Weekly review and patterns" },
  { name: "Search", icon: "search-outline", body: "Find anything in Planora" },
  { name: "Profile", icon: "person-circle-outline", body: "Goals, routine, personalization" },
  { name: "Settings", icon: "settings-outline", body: "Account, privacy, notifications" }
];

export const notificationScreens = new Set<ScreenName>([
  "Dashboard",
  "Tasks",
  "Calendar",
  "Life",
  "Wellbeing",
  "Companion",
  "Insights",
  "Search",
  "Profile",
  "Settings"
]);

export const defaultPersonalProfile: PersonalProfile = {
  lifeStage: null,
  profession: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  interests: [],
  primaryGoals: [],
  preferredWakeTime: null,
  preferredSleepTime: null,
  improvementStyle: "BALANCED",
  useForPersonalization: false,
  allowAnonymousTraining: false
};

export const quickActivities = [
  { title: "Ate a meal", category: "WELLBEING", minutes: 15, icon: "restaurant-outline" as IconName },
  { title: "Gym session", category: "FITNESS", minutes: 45, icon: "barbell-outline" as IconName },
  { title: "Called a friend", category: "SOCIAL", minutes: 10, icon: "people-outline" as IconName },
  { title: "Went outside", category: "PERSONAL", minutes: 20, icon: "sunny-outline" as IconName }
];

/**
 * Mobile palette. Same hues as the web theme, applied flat: solid surfaces plus
 * a real hairline separator, rather than translucent white on white. `border`
 * in particular used to be rgba(255,255,255,0.88) in light mode, which was
 * invisible against a white card.
 */
export function colors(dark: boolean) {
  return {
    dark,
    bg: dark ? "#101827" : "#f7f4ef",
    text: dark ? "#f8fafc" : "#172033",
    muted: dark ? "#97a2b4" : "#5b6577",
    faint: dark ? "#6b7688" : "#8b94a3",
    card: dark ? "#161f2f" : "#ffffff",
    soft: dark ? "#0c121e" : "#efece6",
    border: dark ? "rgba(255,255,255,0.13)" : "rgba(23,32,51,0.12)",
    separator: dark ? "rgba(255,255,255,0.10)" : "rgba(23,32,51,0.10)",
    orange: "#ea580c",
    orangeBright: "#f97316",
    sky: "#0ea5e9",
    green: "#10b981",
    red: "#ef4444",
    amberSoft: dark ? "rgba(249, 115, 22, 0.16)" : "#fff7ed",
    skySoft: dark ? "rgba(14, 165, 233, 0.16)" : "#f0f9ff",
    greenSoft: dark ? "rgba(16, 185, 129, 0.16)" : "#ecfdf5"
  };
}
