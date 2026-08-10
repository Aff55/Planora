"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Search as SearchIcon } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Group, Section } from "../../../components/ui/surfaces";
import { Banner, EmptyState, SkeletonRows } from "../../../components/ui/feedback";
import { label as toLabel } from "../../../lib/format";
import { useResource } from "../../../lib/useResource";
import type { SearchResult } from "../../../lib/types";

function toAppHref(href: string): string {
  return href === "/" ? "/app" : `/app${href}`;
}

function Results() {
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const search = useResource<{ query: string; results: SearchResult[] }>(
    query ? `/search?q=${encodeURIComponent(query)}` : null
  );

  if (!query) {
    return (
      <Group>
        <EmptyState
          icon={SearchIcon}
          title="Search your records"
          body="Tasks, calendar events, life logs and journal entries. Use the field above, or press ⌘K."
        />
      </Group>
    );
  }

  if (search.status === "loading") return <SkeletonRows rows={5} />;
  if (search.status === "error") return <Banner tone="error">{search.error ?? "Search failed."}</Banner>;

  const results = search.data?.results ?? [];
  if (results.length === 0) {
    return (
      <Group>
        <EmptyState icon={SearchIcon} title="No matches" body={`Nothing in your records matches “${query}”.`} />
      </Group>
    );
  }

  return (
    <Group className="stagger">
      {results.map((result) => (
        <Link
          key={`${result.type}-${result.id}`}
          href={toAppHref(result.href)}
          className="enter-row row-hover focus-ring flex items-center gap-4 px-5 py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="break-words text-callout font-medium">{result.title}</p>
            <p className="mt-1 text-footnote text-muted">{toLabel(result.type)}</p>
          </div>
          <ChevronRight className="nudge size-4 shrink-0 text-muted" aria-hidden="true" />
        </Link>
      ))}
    </Group>
  );
}

export default function SearchPage() {
  return (
    <>
      <PageHeader eyebrow="Find" title="Search" description="Across tasks, calendar, life logs and journal entries." />
      <Section>
        <Suspense fallback={<SkeletonRows rows={5} />}>
          <Results />
        </Suspense>
      </Section>
    </>
  );
}
