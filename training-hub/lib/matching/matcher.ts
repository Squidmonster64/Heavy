import { MATCH_HIGH_THRESHOLD, MATCH_LOW_THRESHOLD } from "@/lib/config";
import type { Modality } from "@/lib/validation/structures";

export type MatchableSession = {
  id: string;
  date: string;
  modality: Modality;
  templateName?: string | null;
  plannedDurationSec?: number | null;
  plannedDistanceM?: number | null;
};

export type MatchableActivity = {
  id: string;
  date: string;
  type: string;
  name?: string | null;
  durationSec?: number | null;
  distanceM?: number | null;
  startTime?: string | null;
};

export type MatchScore = {
  activityId: string;
  sessionId: string;
  confidence: number;
  reasons: string[];
  rejected?: string;
};

const TYPE_MAP: Record<string, Modality> = {
  run: "RUN",
  virtualrun: "RUN",
  trailrun: "RUN",
  ride: "CYCLE",
  virtualride: "CYCLE",
  gravelride: "CYCLE",
  weighttraining: "STRENGTH",
  strength: "STRENGTH",
  workout: "REHAB",
  other: "REHAB",
  yoga: "REHAB",
};

export function modalityFromActivityType(type?: string | null): Modality | null {
  if (!type) return null;
  return TYPE_MAP[type.replace(/\s+/g, "").toLowerCase()] ?? null;
}

function withinPercent(actual: number, expected: number, pct: number) {
  if (!expected) return false;
  return Math.abs(actual - expected) / expected <= pct;
}

function nameSimilarity(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.7;
  const leftTokens = new Set(left.split(/\W+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\W+/).filter(Boolean));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const denom = Math.max(leftTokens.size, rightTokens.size);
  return denom ? overlap / denom : 0;
}

export function scoreMatch(session: MatchableSession, activity: MatchableActivity): MatchScore {
  const activityModality = modalityFromActivityType(activity.type);
  if (!activityModality || activityModality !== session.modality) {
    return {
      activityId: activity.id,
      sessionId: session.id,
      confidence: 0,
      reasons: [],
      rejected: "wrong modality",
    };
  }

  let confidence = 0;
  const reasons: string[] = [];

  if (activity.date === session.date) {
    confidence += 0.35;
    reasons.push("same date");
  }

  if (activity.startTime) {
    const start = new Date(activity.startTime);
    const noon = new Date(`${session.date}T12:00:00`);
    const hours = Math.abs(start.getTime() - noon.getTime()) / 3_600_000;
    if (hours <= 2) {
      confidence += 0.2;
      reasons.push("start within 2 hours");
    }
  }

  if (activity.durationSec && session.plannedDurationSec && withinPercent(activity.durationSec, session.plannedDurationSec, 0.15)) {
    confidence += 0.2;
    reasons.push("duration within 15%");
  }

  if (activity.distanceM && session.plannedDistanceM && withinPercent(activity.distanceM, session.plannedDistanceM, 0.15)) {
    confidence += 0.15;
    reasons.push("distance within 15%");
  }

  const similarity = nameSimilarity(activity.name, session.templateName);
  if (similarity >= 0.4) {
    confidence += 0.1 * Math.min(1, similarity);
    reasons.push("name similarity");
  }

  return { activityId: activity.id, sessionId: session.id, confidence: Number(confidence.toFixed(3)), reasons };
}

export type MatchDecision =
  | { status: "AUTO_MATCHED"; activityId: string; confidence: number; scores: MatchScore[] }
  | { status: "AMBIGUOUS"; scores: MatchScore[] }
  | { status: "UNMATCHED"; scores: MatchScore[] };

export function decideMatch(
  session: MatchableSession,
  activities: MatchableActivity[],
  thresholds: { high?: number; low?: number } = {},
): MatchDecision {
  const high = thresholds.high ?? MATCH_HIGH_THRESHOLD;
  const low = thresholds.low ?? MATCH_LOW_THRESHOLD;
  const scores = activities
    .map((activity) => scoreMatch(session, activity))
    .filter((score) => !score.rejected)
    .sort((a, b) => b.confidence - a.confidence);
  const plausible = scores.filter((score) => score.confidence >= low);
  if (plausible.length === 0) return { status: "UNMATCHED", scores };
  if (plausible.length > 1 && plausible[0].confidence - plausible[1].confidence < 0.1) {
    return { status: "AMBIGUOUS", scores: plausible };
  }
  if (plausible[0].confidence >= high) {
    return { status: "AUTO_MATCHED", activityId: plausible[0].activityId, confidence: plausible[0].confidence, scores: plausible };
  }
  return { status: "UNMATCHED", scores: plausible };
}

export { MATCH_HIGH_THRESHOLD, MATCH_LOW_THRESHOLD };
