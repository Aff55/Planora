import type { Metadata } from "next";
import { AppShell } from "../../components/app/AppShell";
import { MessagesProvider } from "../../lib/messages";
import { SessionProvider } from "../../lib/session";

/**
 * Everything behind the session lives here. The whole subtree is noindex —
 * these pages describe one person's records and must never be crawled.
 */
export const metadata: Metadata = {
  // Each route supplies its own title through a segment layout, because the
  // pages themselves are Client Components and cannot export metadata.
  title: { default: "Today", template: "%s · Planora" },
  robots: { index: false, follow: false, nocache: true }
};

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MessagesProvider>
        <AppShell>{children}</AppShell>
      </MessagesProvider>
    </SessionProvider>
  );
}
