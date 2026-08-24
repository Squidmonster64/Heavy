import type { RehabStructure } from "@/lib/validation/structures";

const WORK_COLORS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function intervalKind(name: string): "work" | "rest" | "warmup" | "cooldown" {
  const lower = name.toLowerCase();
  if (lower.includes("warmup") || lower.includes("warm-up") || lower.includes("warm up")) return "warmup";
  if (lower.includes("cooldown") || lower.includes("cool-down") || lower.includes("cool down")) return "cooldown";
  if (lower.includes("rest") || lower.includes("recovery")) return "rest";
  return "work";
}

export function encodeSecondsPro(structure: RehabStructure, name: string): string {
  const intervals = structure.blocks.map((block, index) => {
    const kind = intervalKind(block.name);
    const isTimedRest = kind !== "work";
    return {
      type: kind === "work" ? 0 : kind === "rest" ? 1 : kind === "warmup" ? 2 : 3,
      name: block.name,
      duration: Math.round(block.seconds),
      color: isTimedRest ? String(index % 8) : WORK_COLORS[index % 8],
    };
  });

  const payload = {
    name,
    type: 3,
    soundScheme: 8,
    via: "web",
    numberOfSets: String(structure.rounds),
    intervals,
  };

  return JSON.stringify(payload);
}
