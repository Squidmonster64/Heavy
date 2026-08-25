import { describe, expect, it } from "vitest";
import { addDays, athleteDateKey, formatAthleteLong, isoWeekdayFromDateKey, parseAthleteDate } from "@/lib/dates";

describe("athlete calendar dates", () => {
  it("keeps Monday 24 August as 24 August, not Sunday", () => {
    expect(formatAthleteLong("2026-08-24")).toContain("24");
    expect(formatAthleteLong("2026-08-24")).toMatch(/Monday/i);
    expect(parseAthleteDate("2026-08-24").toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(isoWeekdayFromDateKey("2026-08-24")).toBe(1);
  });

  it("uses Australia/Perth for instants near UTC midnight", () => {
    const stillMonday = new Date("2026-08-24T15:59:00.000Z");
    const tuesday = new Date("2026-08-24T16:00:00.000Z");
    expect(athleteDateKey(stillMonday)).toBe("2026-08-24");
    expect(athleteDateKey(tuesday)).toBe("2026-08-25");
  });

  it("adds days without UTC shifting the key", () => {
    expect(addDays("2026-08-24", 1)).toBe("2026-08-25");
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });
});
