import type { PersonalProfile, SettingsShape } from "./types";
import type { ScreenName } from "./theme";

export function resolveDark(theme?: SettingsShape["theme"], fallback?: string | null, systemDark = false) {
  if (theme === "DARK") return true;
  if (theme === "LIGHT") return false;
  if (theme === "SYSTEM") return systemDark;
  return fallback === "DARK" || systemDark;
}


export function searchResultScreen(type: string): ScreenName {
  if (type === "task") return "Tasks";
  if (type === "calendar") return "Calendar";
  if (type === "activity") return "Life";
  if (type === "journal") return "Wellbeing";
  return "Search";
}

export function shiftMonthKey(month: string, direction: -1 | 1) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year ?? new Date().getFullYear(), (monthNumber ?? 1) - 1 + direction, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthKey(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year ?? new Date().getFullYear(), (monthNumber ?? 1) - 1, 1).toLocaleDateString([], {
    month: "long",
    year: "numeric"
  });
}

export function friendlyLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function parseList(value: string, limit: number) {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

export function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function profileCompleteness(profile: PersonalProfile) {
  const values = [
    profile.lifeStage,
    profile.profession,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevel,
    profile.interests.length,
    profile.primaryGoals.length,
    profile.preferredWakeTime,
    profile.preferredSleepTime
  ];
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}
