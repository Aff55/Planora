import type { Metadata, Viewport } from "next";
import { ThemeProvider, themeBootScript } from "../lib/theme";
import "./globals.css";

/**
 * Root layout.
 *
 * The theme boot script runs before first paint so a dark-theme visitor never
 * sees a flash of light chrome. It is inline by necessity — an external script
 * would paint first — and it is the only inline script in the app.
 *
 * No font link, no analytics, no third-party tag. Both type families are
 * OS-provided, so the document makes no network request of its own.
 */

const siteName = "Planora";
const description =
  "A private life planner with an on-device AI companion. Your tasks, calendar, routines and wellbeing stay on your machine.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${siteName} — a private life planner that adapts without profiling you`,
    template: `%s · ${siteName}`
  },
  description,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} — a private life planner that adapts without profiling you`,
    description,
    locale: "en"
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — a private life planner`,
    description
  },
  formatDetection: { telephone: false, address: false, email: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1520" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
