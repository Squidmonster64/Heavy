export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function snapshotStructure(structure: unknown) {
  return clone(structure);
}
