import { describe, expect, it } from "vitest";
import { buildPage } from "../src/lib/pagination.js";

describe("bounded pages", () => {
  it("returns one bounded page and a stable continuation cursor", () => {
    const page = buildPage([{ id: "a" }, { id: "b" }, { id: "c" }], 2);
    expect(page.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(page.pageInfo).toEqual({ hasMore: true, nextCursor: "b", limit: 2 });
  });

  it("omits a continuation cursor for the final page", () => {
    const page = buildPage([{ id: "a" }], 2);
    expect(page.pageInfo).toEqual({ hasMore: false, nextCursor: null, limit: 2 });
  });
});
