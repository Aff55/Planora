"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { Logo } from "../brand/Logo";
import { IconButton } from "../ui/controls";
import { apiRequest } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { SITE_NAV } from "../../lib/site-content";

/**
 * Public site header and footer.
 *
 * The only interactive parts of the public site are the theme toggle, the
 * mobile menu, and the sign-in link, so this is the sole client boundary —
 * every page itself stays a Server Component.
 *
 * The session cookie is `HttpOnly; Path=/api` on the API origin, so the server
 * cannot know whether a visitor is signed in. The header probes `/auth/me`
 * once and swaps its call to action. It deliberately does not redirect: a
 * signed-in person who navigates to the marketing site usually meant to, and
 * bouncing them out would be hostile. They get a prominent route in instead.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest("/auth/me")
      .then(() => !cancelled && setSignedIn(true))
      .catch(() => !cancelled && setSignedIn(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const cta = signedIn
    ? { href: "/app", label: "Open Planora" }
    : { href: "/auth", label: "Sign in" };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-app items-center gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="focus-ring shrink-0 rounded-md" aria-label="Planora home">
          <Logo size="sm" />
        </Link>

        <nav aria-label="Site" className="ml-4 hidden items-center gap-1 md:flex">
          {SITE_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "focus-ring flex min-h-touch items-center rounded-md px-3 text-callout transition-colors",
                  active ? "font-semibold text-ink" : "font-medium text-muted hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <IconButton
            icon={resolved === "DARK" ? Sun : Moon}
            label={resolved === "DARK" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggle}
          />
          <Link
            href={cta.href}
            className="focus-ring inline-flex min-h-touch items-center gap-2 rounded-md bg-accent-strong px-4 text-callout font-semibold text-white transition hover:bg-accent-hover active:scale-[0.97]"
          >
            {cta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <div className="md:hidden">
            <IconButton
              icon={menuOpen ? X : Menu}
              label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            />
          </div>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Site" className="enter-row border-t border-hairline px-5 py-2 md:hidden">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring flex min-h-touch items-center rounded-md px-2 text-callout font-medium text-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-app flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo size="sm" />
          <p className="mt-3 text-footnote leading-relaxed text-muted">
            A private life planner with an on-device AI companion. Your records stay in a database on your own machine.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring flex min-h-touch items-center rounded-md text-footnote text-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth"
            className="focus-ring flex min-h-touch items-center rounded-md text-footnote font-semibold text-accent-text"
          >
            Sign in
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-app px-5 pb-8 sm:px-8">
        <p className="text-micro tracking-normal text-muted">
          Planora runs locally. This site loads no third-party scripts, fonts, or trackers.
        </p>
      </div>
    </footer>
  );
}
