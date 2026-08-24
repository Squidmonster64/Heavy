import type { RunStructure } from "@/lib/validation/structures";

const SPORT_RUNNING = 0x25;
const FIXED_TAG = Buffer.from([0x25, 0x00, 0x00, 0x00, 0x03, 0x03, 0xd9, 0x01, 0x01, 0x01]);
const REPEAT_TRAILER = Buffer.from([0xd9, 0x01, 0x08, 0x01]);
const TIME = 0x01;
const DISTANCE = 0x02;
const PACE_MARK = 0x0e;
const MAX_DURATION_PERTURB = 4;
const MAX_PACE_PERTURB = 0.05;

export type WatchleticEncodeResult = {
  url: string;
  base64: string;
  bytes: Uint8Array;
  perturbed: boolean;
};

function writeF64BE(value: number) {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(value, 0);
  return buf;
}

function parsePaceRange(text: string, fallback: string) {
  const source = /easy/i.test(text) ? fallback : text;
  const matches = [...source.matchAll(/(\d+):(\d+(?:\.\d+)?)/g)].map((match) => {
    return Number(match[1]) * 60 + Number(match[2]);
  });
  if (matches.length >= 2) return { low: matches[0], high: matches[1] };
  if (matches.length === 1) return { low: matches[0], high: matches[0] + 10 };
  return { low: 390, high: 450 };
}

function timeStep(seconds: number, pace: { low: number; high: number }) {
  return Buffer.concat([
    Buffer.from([TIME]),
    writeF64BE(seconds),
    Buffer.from([PACE_MARK]),
    writeF64BE(pace.low),
    writeF64BE(pace.high),
  ]);
}

function distanceStep(km: number, pace: { low: number; high: number }) {
  return Buffer.concat([
    Buffer.from([DISTANCE]),
    writeF64BE(km * 1000),
    Buffer.from([PACE_MARK]),
    writeF64BE(pace.low),
    writeF64BE(pace.high),
  ]);
}

function closingDuration(seconds: number) {
  return Buffer.concat([Buffer.from([TIME]), writeF64BE(seconds)]);
}

function header(name: string) {
  const nameBytes = Buffer.from(name, "utf8");
  if (nameBytes.length > 255) throw new Error("Watchletic workout name is too long");
  return Buffer.concat([Buffer.from([0x01, 0x01, nameBytes.length]), nameBytes, Buffer.from([SPORT_RUNNING]), FIXED_TAG]);
}

function repeatHeader(repeatCount: number, substepCount: number) {
  return Buffer.concat([Buffer.from([0x00, 0x06, repeatCount, substepCount]), REPEAT_TRAILER]);
}

function encodeBytes(structure: RunStructure, name: string, easyPace: string, durationShift = 0, paceShift = 0) {
  const warmupPace = parsePaceRange(structure.warmupPace, easyPace);
  const workPace = parsePaceRange(structure.workPace, easyPace);
  const recoveryPace = parsePaceRange(structure.recoveryPace, easyPace);
  warmupPace.low += paceShift;
  warmupPace.high += paceShift;
  workPace.low += paceShift;
  workPace.high += paceShift;

  const warmup = timeStep(structure.warmupMin * 60 + durationShift, warmupPace);
  const work = structure.workKm != null
    ? distanceStep(structure.workKm, workPace)
    : timeStep((structure.workSeconds ?? 0) + durationShift, workPace);
  const recovery = timeStep(structure.recoverySeconds, recoveryPace);
  const substeps = Buffer.concat([work, recovery]);
  const cooldownSeconds = (structure.cooldownMin ?? 10) * 60;
  const close = closingDuration(cooldownSeconds);

  return Buffer.concat([
    header(name),
    warmup,
    repeatHeader(structure.reps, 2),
    substeps,
    close,
  ]);
}

function toBase64(bytes: Buffer) {
  return bytes.toString("base64");
}

export function encodeWatchletic(
  structure: RunStructure,
  options: { name?: string; easyPace?: string } = {},
): WatchleticEncodeResult {
  const name = options.name ?? "Run";
  const easyPace = options.easyPace ?? "6:30-7:30/km";
  let durationShift = 0;
  let paceShift = 0;
  let perturbed = false;
  let bytes = encodeBytes(structure, name, easyPace);
  let base64 = toBase64(bytes);

  while (base64.includes("/")) {
    perturbed = true;
    if (durationShift + 0.25 <= MAX_DURATION_PERTURB) {
      durationShift += 0.25;
    } else if (paceShift + 0.01 <= MAX_PACE_PERTURB) {
      paceShift += 0.01;
    } else {
      throw new Error("Watchletic encode could not avoid '/' without exceeding perturbation bounds");
    }
    bytes = encodeBytes(structure, name, easyPace, durationShift, paceShift);
    base64 = toBase64(bytes);
  }

  return {
    url: `https://watchletic.com/w/${base64}`,
    base64,
    bytes: new Uint8Array(bytes),
    perturbed,
  };
}

export function inspectWatchletic(bytes: Uint8Array) {
  const buf = Buffer.from(bytes);
  if (buf[0] !== 0x01 || buf[1] !== 0x01) throw new Error("Missing header");
  const nameLength = buf[2];
  const name = buf.subarray(3, 3 + nameLength).toString("utf8");
  const sportOffset = 3 + nameLength;
  const sport = buf[sportOffset];
  const tag = buf.subarray(sportOffset + 1, sportOffset + 1 + FIXED_TAG.length);
  const rest = buf.subarray(sportOffset + 1 + FIXED_TAG.length);
  const repeatAt = rest.indexOf(Buffer.from([0x00, 0x06]));
  if (repeatAt < 0) throw new Error("Missing repeat header");
  const repeatCount = rest[repeatAt + 2];
  const substepCount = rest[repeatAt + 3];
  return { name, nameLength, sport, tag: Buffer.from(tag), repeatCount, substepCount };
}

export const WATCHLETIC_CONSTANTS = {
  SPORT_RUNNING,
  FIXED_TAG,
  TIME,
  DISTANCE,
  PACE_MARK,
  MAX_DURATION_PERTURB,
  MAX_PACE_PERTURB,
};
