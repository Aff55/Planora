import type { Metadata } from "next";

/**
 * Segment layout existing only to supply a title. The page itself is a Client
 * Component, and Client Components cannot export `metadata`.
 */
export const metadata: Metadata = { title: "Insights" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
