import { describe, expect, it } from "vitest";
import { IntervalsError, intervalsAuthHeader, intervalsRequest, resolveAthleteId } from "@/lib/intervals/types";
import { bulkUpsertEvents, externalIdForSession } from "@/lib/intervals/client";
import { decideMatch } from "@/lib/matching/matcher";

function mockFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const result = handler(url, init);
    return new Response(JSON.stringify(result.body), { status: result.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

describe("Intervals client", () => {
  it("uses Basic API_KEY auth and never puts the key in query strings", async () => {
    expect(intervalsAuthHeader("secret-key")).toBe(`Basic ${Buffer.from("API_KEY:secret-key").toString("base64")}`);
    let headers: HeadersInit | undefined;
    await intervalsRequest({
      apiKey: "secret-key",
      path: "/athlete/i568864",
      fetchImpl: mockFetch((url, init) => {
        headers = init?.headers;
        expect(url.includes("secret-key")).toBe(false);
        return { status: 200, body: { id: "i568864", name: "Dave" } };
      }),
    });
    expect(JSON.stringify(headers)).not.toContain("secret-key");
    expect(JSON.stringify(headers)).toContain("Basic");
  });

  it("bulk upserts with stable external ids and is idempotent", async () => {
    const calls: unknown[] = [];
    const fetchImpl = mockFetch((url, init) => {
      calls.push({ url, body: init?.body });
      expect(url).toContain("/events/bulk");
      expect(url).toContain("upsert=true");
      return { status: 200, body: [{ id: 9, external_id: "traininghub:abc123" }] };
    });
    const event = {
      external_id: externalIdForSession("abc123"),
      category: "WORKOUT",
      start_date_local: "2026-08-25T00:00:00",
      type: "Run",
      name: "5 × 3 min Threshold",
    };
    await bulkUpsertEvents({ athleteId: "0", apiKey: "k", events: [event], fetchImpl });
    await bulkUpsertEvents({ athleteId: "0", apiKey: "k", events: [event], fetchImpl });
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls[0])).toContain("traininghub:abc123");
  });

  it("surfaces API errors without swallowing them", async () => {
    await expect(
      intervalsRequest({
        apiKey: "k",
        path: "/athlete/0",
        fetchImpl: mockFetch(() => ({ status: 503, body: { error: "down" } })),
      }),
    ).rejects.toBeInstanceOf(IntervalsError);
  });

  it("can address athlete 0", () => {
    expect(resolveAthleteId(undefined)).toBe("0");
    expect(resolveAthleteId("i568864")).toBe("i568864");
  });
});

describe("activity matcher", () => {
  const session = {
    id: "s1",
    date: "2026-08-24",
    modality: "RUN" as const,
    templateName: "Threshold",
    plannedDurationSec: 3600,
    plannedDistanceM: 10000,
  };

  it("auto-matches a clear same-day run", () => {
    const decision = decideMatch(session, [{
      id: "a1",
      date: "2026-08-24",
      type: "Run",
      name: "Threshold",
      durationSec: 3500,
      distanceM: 9800,
      startTime: "2026-08-24T11:00:00",
    }]);
    expect(decision.status).toBe("AUTO_MATCHED");
  });

  it("rejects the wrong modality", () => {
    const decision = decideMatch(session, [{
      id: "a1",
      date: "2026-08-24",
      type: "Ride",
      name: "Threshold",
      durationSec: 3500,
    }]);
    expect(decision.status).toBe("UNMATCHED");
  });

  it("marks multiple plausible activities as ambiguous", () => {
    const decision = decideMatch(session, [
      { id: "a1", date: "2026-08-24", type: "Run", name: "Morning", durationSec: 3500, startTime: "2026-08-24T11:00:00" },
      { id: "a2", date: "2026-08-24", type: "Run", name: "Evening", durationSec: 3400, startTime: "2026-08-24T11:20:00" },
    ]);
    expect(decision.status).toBe("AMBIGUOUS");
  });

  it("stays unmatched when nothing is close", () => {
    const decision = decideMatch(session, [{
      id: "a1",
      date: "2026-08-20",
      type: "Run",
      name: "Easy",
      durationSec: 900,
    }]);
    expect(decision.status).toBe("UNMATCHED");
  });
});
