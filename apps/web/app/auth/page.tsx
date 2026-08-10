import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "../../components/auth/AuthScreen";
import { MessagesProvider } from "../../lib/messages";
import { SessionProvider } from "../../lib/session";
import { SkeletonPage } from "../../components/ui/feedback";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Planora, or create an account on this machine.",
  robots: { index: false, follow: false }
};

export default function AuthRoute() {
  return (
    <SessionProvider>
      <MessagesProvider>
        <main id="main" className="mx-auto w-full max-w-app px-5 py-10">
          <Suspense fallback={<SkeletonPage metrics={0} rows={3} />}>
            <AuthScreen />
          </Suspense>
        </main>
      </MessagesProvider>
    </SessionProvider>
  );
}
