import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSessionToken, isSessionTokenValid } from "@/lib/auth";

describe("secrets and auth", () => {
  it("does not ship the Intervals API key in client modules", () => {
    const files = [
      "app/session-card.tsx",
      "app/sync/controls.tsx",
      "app/settings/form.tsx",
      "app/login/login-form.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(source).not.toContain("INTERVALS_API_KEY");
      expect(source).not.toMatch(/lib\/intervals\/client/);
    }
  });

  it("keeps passcode sessions signed", async () => {
    process.env.APP_PASSCODE = "test-pass";
    const token = await createSessionToken();
    expect(await isSessionTokenValid(token)).toBe(true);
    expect(await isSessionTokenValid("nope")).toBe(false);
  });
});
