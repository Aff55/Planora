import { describe, expect, it } from "vitest";
import { KeyedSingleflight } from "../src/lib/singleflight.js";

describe("keyed singleflight", () => {
  it("shares one in-flight operation for the same key", async () => {
    const singleflight = new KeyedSingleflight();
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = async () => {
      calls += 1;
      await gate;
      return { ok: true };
    };

    const first = singleflight.run("user-1", operation);
    const second = singleflight.run("user-1", operation);
    expect(calls).toBe(1);
    release?.();
    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
  });

  it("allows different keys to proceed independently", async () => {
    const singleflight = new KeyedSingleflight();
    let calls = 0;
    await Promise.all([
      singleflight.run("user-1", async () => ++calls),
      singleflight.run("user-2", async () => ++calls)
    ]);
    expect(calls).toBe(2);
  });
});
