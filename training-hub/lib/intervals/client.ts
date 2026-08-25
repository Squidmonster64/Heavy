import {
  getIntervalsCredentials,
  intervalsRequest,
  resolveAthleteId,
  type FetchLike,
  type IntervalsActivity,
  type IntervalsAthlete,
  type IntervalsEvent,
  type IntervalsWellness,
} from "./types";

export { getIntervalsCredentials, intervalsRequest, resolveAthleteId };

export async function getAthlete(athleteId: string, apiKey: string, fetchImpl?: FetchLike) {
  return intervalsRequest<IntervalsAthlete>({
    apiKey,
    path: `/athlete/${athleteId}`,
    fetchImpl,
  });
}

export async function listActivities(options: {
  athleteId: string;
  apiKey: string;
  oldest: string;
  newest: string;
  fetchImpl?: FetchLike;
}) {
  return intervalsRequest<IntervalsActivity[]>({
    apiKey: options.apiKey,
    path: `/athlete/${options.athleteId}/activities`,
    query: { oldest: options.oldest, newest: options.newest },
    fetchImpl: options.fetchImpl,
  });
}

export async function listWellness(options: {
  athleteId: string;
  apiKey: string;
  oldest: string;
  newest: string;
  fetchImpl?: FetchLike;
}) {
  return intervalsRequest<IntervalsWellness[] | Record<string, IntervalsWellness>>({
    apiKey: options.apiKey,
    path: `/athlete/${options.athleteId}/wellness`,
    query: { oldest: options.oldest, newest: options.newest },
    fetchImpl: options.fetchImpl,
  });
}

export async function bulkUpsertEvents(options: {
  athleteId: string;
  apiKey: string;
  events: IntervalsEvent[];
  fetchImpl?: FetchLike;
}) {
  return intervalsRequest<IntervalsEvent[]>({
    apiKey: options.apiKey,
    method: "POST",
    path: `/athlete/${options.athleteId}/events/bulk`,
    query: { upsert: true },
    body: options.events,
    fetchImpl: options.fetchImpl,
  });
}

export function externalIdForSession(sessionId: string) {
  return `traininghub:${sessionId}`;
}
