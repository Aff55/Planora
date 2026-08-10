export type PageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
};

export function buildPage<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    pageInfo: {
      hasMore,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
      limit
    } satisfies PageInfo
  };
}
