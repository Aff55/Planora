import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleUser,
  Database,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Settings,
  type LucideIcon
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description, used by the command palette and the mobile sheet. */
  hint: string;
};

export const navItems: NavItem[] = [
  { href: "/app", label: "Today", icon: LayoutDashboard, hint: "Your day at a glance" },
  { href: "/app/tasks", label: "Tasks", icon: ListChecks, hint: "Everything you plan to do" },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays, hint: "Events and scheduling" },
  { href: "/app/life", label: "Life", icon: Activity, hint: "Food, movement, people, outdoors" },
  { href: "/app/wellbeing", label: "Wellbeing", icon: HeartPulse, hint: "Mood, sleep, water, journal" },
  { href: "/app/companion", label: "Companion", icon: MessageCircle, hint: "Ask the on-device model" },
  { href: "/app/insights", label: "Insights", icon: BarChart3, hint: "Patterns and what Planora learned" },
  { href: "/app/data", label: "Your data", icon: Database, hint: "Every record Planora holds" },
  { href: "/app/profile", label: "Profile", icon: CircleUser, hint: "Optional context and consent" },
  { href: "/app/settings", label: "Settings", icon: Settings, hint: "Account, privacy, theme, export" }
];

/** The four that earn a permanent slot on a phone; the rest live under More. */
const primaryHrefs = new Set(["/app", "/app/tasks", "/app/life", "/app/companion"]);

export const mobilePrimary = navItems.filter((item) => primaryHrefs.has(item.href));
export const mobileSecondary = navItems.filter((item) => !primaryHrefs.has(item.href));

/** Exact for the dashboard, prefix for everything else. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
