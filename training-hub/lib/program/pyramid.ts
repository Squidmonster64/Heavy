import type { StrengthStructure } from "@/lib/validation/structures";
import { clone } from "./clone";

const ORDER = ["durability", "cardio", "strength", "power"] as const;

export function orderStrengthBlocks(structure: StrengthStructure): StrengthStructure {
  const next = clone(structure);
  next.supersets.sort((a, b) => ORDER.indexOf(a.role ?? "strength") - ORDER.indexOf(b.role ?? "strength"));
  return next;
}

export function dropPowerBlocks(structure: StrengthStructure): StrengthStructure {
  const next = clone(structure);
  const remaining = next.supersets.filter((group) => group.role !== "power");
  next.supersets = remaining.length ? remaining : next.supersets;
  return next;
}

export function applySymptomFlags(structure: StrengthStructure, flags: string[]) {
  if (!flags.length) return orderStrengthBlocks(structure);
  return dropPowerBlocks(orderStrengthBlocks(structure));
}
