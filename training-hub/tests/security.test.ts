import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("secrets", () => {
  it("does not ship the Intervals API key in client modules", () => {
    const files = [
      "app/session-card.tsx",
      "app/sync/controls.tsx",
      "app/settings/form.tsx",
      "app/shell.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(source).not.toContain("INTERVALS_API_KEY");
      expect(source).not.toMatch(/lib\/intervals\/client/);
    }
  });
});
