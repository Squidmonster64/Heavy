export const ATHLETE_TZ = "Australia/Perth";

const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ATHLETE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const longDateFormat = new Intl.DateTimeFormat("en-AU", {
  timeZone: ATHLETE_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function athleteDateKey(instant: Date, timeZone = ATHLETE_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function todayAthleteDateKey(now = new Date(), timeZone = ATHLETE_TZ): string {
  return athleteDateKey(now, timeZone);
}

/** Calendar dates are stored as UTC midnight of the athlete-local date key. */
export function parseAthleteDate(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid athlete date: ${dateKey}`);
  }
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function dateKeyFromStored(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatAthleteLong(dateKey: string): string {
  const stored = parseAthleteDate(dateKey);
  // Format the stored UTC date as a calendar date, not as a zoned instant.
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(stored);
}

export function isoWeekdayFromDateKey(dateKey: string): number {
  // 1 = Monday ... 7 = Sunday, using the calendar date itself (UTC noon-safe via stored midnight + UTC day).
  const day = parseAthleteDate(dateKey).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDays(dateKey: string, days: number): string {
  const date = parseAthleteDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFromStored(date);
}

export function dateKeysInclusive(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = startKey;
  while (cursor <= endKey) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function horizonEnd(startKey: string, weeks: number): string {
  return addDays(startKey, weeks * 7 - 1);
}

export function formatDateTimeAthlete(instant: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: ATHLETE_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

export { dateKeyFormat, longDateFormat };
