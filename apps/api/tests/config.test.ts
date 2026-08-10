import { describe, expect, it } from "vitest";
import { getPositiveInteger, getTrustProxyHops } from "../src/lib/config.js";

describe("runtime configuration", () => {
  it("requires explicit proxy topology in production", () => {
    expect(() => getTrustProxyHops({ NODE_ENV: "production" })).toThrow(/TRUST_PROXY_HOPS/);
    expect(getTrustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "0" })).toBe(0);
    expect(getTrustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "2" })).toBe(2);
  });

  it("rejects malformed proxy and quota values", () => {
    expect(() => getTrustProxyHops({ TRUST_PROXY_HOPS: "1.5" })).toThrow();
    expect(() => getTrustProxyHops({ TRUST_PROXY_HOPS: "-1" })).toThrow();
    expect(() => getPositiveInteger("LIMIT", 10, { LIMIT: "0" })).toThrow();
    expect(getPositiveInteger("LIMIT", 10, {})).toBe(10);
  });
});
