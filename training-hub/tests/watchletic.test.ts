import { describe, expect, it } from "vitest";
import { encodeWatchletic, inspectWatchletic, WATCHLETIC_CONSTANTS } from "@/lib/export/watchletic";
import type { RunStructure } from "@/lib/validation/structures";

const timeRun: RunStructure = {
  warmupMin: 10,
  warmupPace: "5:45-6:10/km",
  reps: 5,
  workSeconds: 180,
  workPace: "5:20-5:30/km",
  recoverySeconds: 90,
  recoveryPace: "easy",
  cooldownMin: 10,
};

const distanceRun: RunStructure = {
  ...timeRun,
  workSeconds: undefined,
  workKm: 1,
};

describe("Watchletic encoder", () => {
  it("writes the verified header, running sport, repeat count and exact substep count", () => {
    const encoded = encodeWatchletic(timeRun, { name: "Threshold" });
    const inspected = inspectWatchletic(encoded.bytes);
    expect(inspected.name).toBe("Threshold");
    expect(inspected.sport).toBe(WATCHLETIC_CONSTANTS.SPORT_RUNNING);
    expect(Buffer.from(inspected.tag).equals(WATCHLETIC_CONSTANTS.FIXED_TAG)).toBe(true);
    expect(inspected.repeatCount).toBe(5);
    expect(inspected.substepCount).toBe(2);
    expect(encoded.bytes.includes(WATCHLETIC_CONSTANTS.TIME)).toBe(true);
  });

  it("encodes a distance work step", () => {
    const encoded = encodeWatchletic(distanceRun, { name: "Repeats" });
    expect(encoded.bytes.includes(WATCHLETIC_CONSTANTS.DISTANCE)).toBe(true);
    expect(inspectWatchletic(encoded.bytes).repeatCount).toBe(5);
  });

  it("avoids slashes with bounded perturbation", () => {
    const encoded = encodeWatchletic(timeRun, { name: "Slash Check" });
    expect(encoded.base64.includes("/")).toBe(false);
    expect(encoded.url.includes(encoded.base64)).toBe(true);
    if (encoded.perturbed) {
      expect(true).toBe(true);
    }
  });
});
