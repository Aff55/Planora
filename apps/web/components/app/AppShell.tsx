"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Grid3x3, LogOut, Moon, Search, Sun } from "lucide-react";
import { Logo } from "../brand/Logo";
import { Banner, SkeletonPage } from "../ui/feedback";
import { IconButton } from "../ui/controls";
import { apiRequest } from "../../lib/api";
import { useMessages } from "../../lib/messages";
import { useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";
import { isActive, mobilePrimary, mobileSecondary, navItems } from "./nav";
import { CommandPalette } from "./CommandPalette";
import { CompanionDock } from "./CompanionDock";

/**
 * The authenticated shell, and the auth gate.
 *
 * The gate has three states, not two. While the `/auth/me` probe is in flight
 * the status is "unknown", and the shell renders a layout-shaped skeleton —
 * showing the sign-in screen at that moment would flash the wrong page at
 * every returning user on every cold load. See DESIGN.md §7a.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user, settings, applySettings, signOut } = useSession();
  const { message, clear, fail } = useMessages();
  const { resolved, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === "anonymous") {
      const next = encodeURIComponent(pathname);
      router.replace(`/auth?next=${next}`);
    }
  }, [status, pathname, router]);

  // Close the mobile sheet whenever navigation lands somewhere new.
  useEffect(() => setMobileMoreOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (status !== "authenticated" || !user) {
    return (
      <div className="mx-auto w-full max-w-app px-5 py-10">
        <span className="sr-only" role="status">
          {status === "unknown" ? "Restoring your session" : "Redirecting to sign in"}
        </span>
        <SkeletonPage />
      </div>
    );
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/app/search?q=${encodeURIComponent(trimmed)}`);
    setQuery("");
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    router.replace("/auth");
  }

  /**
   * The toggle has to write through to the account, not just to localStorage.
   * The account's own `theme` is applied on every load, so a local-only toggle
   * silently reverts on the next navigation whenever the stored preference is
   * SYSTEM — which is the default for every new account.
   */
  async function handleThemeToggle() {
    const next = toggle();
    const nextSettings = { ...settings, theme: next };
    applySettings(nextSettings);
    try {
      await apiRequest("/auth/settings", { method: "PUT", body: nextSettings });
    } catch (cause) {
      fail(cause);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <a href="#main" className="skip-link focus-ring">
        Skip to content
      </a>

      <aside className="hidden w-64 shrink-0 border-r border-line px-3 py-6 lg:flex lg:flex-col xl:w-72">
        <div className="px-2 pb-6">
          <Link href="/app" className="focus-ring rounded-md" aria-label="Planora, go to today">
            <Logo size="sm" />
          </Link>
        </div>
        <nav aria-label="Sections" className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "focus-ring flex min-h-touch items-center gap-3.5 rounded-md px-3 text-callout transition-colors duration-state",
                  active ? "bg-accent-wash font-semibold text-accent-text" : "font-medium text-muted hover:bg-sunken hover:text-ink"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-2 pt-6">
          <p className="text-footnote text-muted">Signed in as</p>
          <p className="truncate text-callout font-semibold">{user.name}</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-ground/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-app items-center gap-3">
            <div className="lg:hidden">
              <Link href="/app" className="focus-ring rounded-md" aria-label="Planora, go to today">
                <Logo variant="mark" size="sm" />
              </Link>
            </div>

            <form onSubmit={submitSearch} role="search" className="relative hidden min-w-0 flex-1 sm:block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-touch w-full rounded-md border border-line bg-surface pl-11 pr-4 text-callout outline-none transition duration-state placeholder:text-muted focus:border-accent-strong"
                placeholder="Search tasks, events, life logs, journal"
                aria-label="Search your Planora records"
                type="search"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="focus-ring hidden min-h-touch items-center gap-2 rounded-md border border-line bg-surface px-3 text-footnote text-muted transition hover:text-ink md:inline-flex"
                aria-keyshortcuts="Meta+K Control+K"
              >
                Commands
                <kbd className="rounded-sm border border-line px-1.5 py-0.5 font-evidence text-micro">⌘K</kbd>
              </button>

              <IconButton
                icon={resolved === "DARK" ? Sun : Moon}
                label={resolved === "DARK" ? "Switch to light theme" : "Switch to dark theme"}
                onClick={() => void handleThemeToggle()}
              />
              <IconButton icon={LogOut} label={signingOut ? "Signing out" : "Sign out"} onClick={handleSignOut} disabled={signingOut} />
            </div>
          </div>
        </header>

        {message && (
          <div className="mx-auto w-full max-w-app px-4 pt-4 sm:px-6">
            <Banner tone={message.tone} onDismiss={clear}>
              {message.text}
            </Banner>
          </div>
        )}

        <main
          id="main"
          key={pathname}
          className="enter-route mx-auto w-full max-w-app flex-1 px-4 py-8 pb-28 sm:px-6 lg:pb-10"
        >
          {children}
        </main>

        <CompanionDock />

        {mobileMoreOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileMoreOpen(false)}
              className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            />
            <div className="enter-sheet fixed inset-x-2 bottom-[4.75rem] z-40 grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-2 shadow-floating lg:hidden">
              {mobileSecondary.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "focus-ring flex min-h-touch items-center gap-3 rounded-md px-3 text-callout font-medium transition-colors",
                      active ? "bg-accent-wash text-accent-text" : "text-muted hover:bg-sunken"
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ground/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
        >
          <div className="grid grid-cols-5 gap-1 px-1.5 py-1.5">
            {mobilePrimary.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "focus-ring flex min-h-touch min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 transition",
                    active ? "text-accent-text" : "text-muted"
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="w-full truncate text-center text-micro font-medium tracking-normal">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              aria-expanded={mobileMoreOpen}
              aria-label="More sections"
              onClick={() => setMobileMoreOpen((open) => !open)}
              className={clsx(
                "focus-ring flex min-h-touch min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 transition",
                mobileMoreOpen || mobileSecondary.some((item) => isActive(pathname, item.href)) ? "text-accent-text" : "text-muted"
              )}
            >
              <Grid3x3 className="size-5 shrink-0" aria-hidden="true" />
              <span className="w-full truncate text-center text-micro font-medium tracking-normal">More</span>
            </button>
          </div>
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
