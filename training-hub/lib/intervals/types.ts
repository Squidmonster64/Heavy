export const INTERVALS_BASE_URL = "https://intervals.icu/api/v1";

export type IntervalsActivity = {
  id: string | number;
  start_date_local?: string;
  type?: string;
  name?: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  icu_training_load?: number;
  [key: string]: unknown;
};

export type IntervalsWellness = {
  id?: string;
  restingHR?: number;
  hrv?: number;
  sleepSecs?: number;
  spO2?: number;
  weight?: number;
  atl?: number;
  ctl?: number;
  [key: string]: unknown;
};

export type IntervalsEvent = {
  id?: number | string;
  external_id?: string;
  category?: string;
  start_date_local?: string;
  type?: string;
  name?: string;
  description?: string;
};

export type IntervalsAthlete = {
  id?: string | number;
  name?: string;
  firstname?: string;
  lastname?: string;
};

export type IntervalsRequest = {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

export class IntervalsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "IntervalsError";
  }
}

export type FetchLike = typeof fetch;

export function intervalsAuthHeader(apiKey: string) {
  const token = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

export function resolveAthleteId(configured?: string | null) {
  return configured && configured.length > 0 ? configured : "0";
}

export async function intervalsRequest<T>(
  options: IntervalsRequest & {
    apiKey: string;
    fetchImpl?: FetchLike;
    baseUrl?: string;
  },
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(`${options.baseUrl ?? INTERVALS_BASE_URL}${options.path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  const response = await fetchImpl(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: intervalsAuthHeader(options.apiKey),
      Accept: "application/json",
      ...(options.body != null ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new IntervalsError(`Intervals.icu request failed (${response.status})`, response.status, text.slice(0, 500));
  }
  return text ? JSON.parse(text) as T : (undefined as T);
}

export function getIntervalsCredentials() {
  const apiKey = process.env.INTERVALS_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    athleteId: resolveAthleteId(process.env.INTERVALS_ATHLETE_ID),
  };
}
