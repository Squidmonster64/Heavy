import { describe, expect, it } from "vitest";
import { encodeSecondsPro } from "@/lib/export/secondsPro";
import known from "./fixtures/seconds-pro-known-good.json";

describe("Seconds Pro encoder", () => {
  it("matches the known-good compact JSON quirks", () => {
    const json = encodeSecondsPro(
      {
        rounds: 1,
        blocks: [
          { name: "Nerve glide", seconds: 45 },
          { name: "Rest", seconds: 30 },
        ],
      },
      "Nerve Glide — Stage 1",
    );
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(known);
    expect(typeof parsed.numberOfSets).toBe("string");
    expect(parsed.numberOfSets).toBe("1");
    expect(parsed.type).toBe(3);
    expect(parsed.soundScheme).toBe(8);
    expect(parsed.via).toBe("web");
    expect(typeof parsed.intervals[0].color).toBe("number");
    expect(typeof parsed.intervals[1].color).toBe("string");
    expect(json.includes("\n")).toBe(false);
  });
});
