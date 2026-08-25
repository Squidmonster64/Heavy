export const MATCH_HIGH_THRESHOLD = 0.7;
export const MATCH_LOW_THRESHOLD = 0.4;

export const DEFAULT_HORIZON_WEEKS = 6;

export const DEFAULT_PROGRAM_CONFIG = {
  taper: {
    enabled: true,
    strengthVolumeReductionPct: 35,
    runVolumeReductionPct: 35,
  },
  nerveGlideStages: [] as Array<{
    stage: number;
    start: string;
    end: string;
    templateId: string;
  }>,
  matching: {
    highThreshold: MATCH_HIGH_THRESHOLD,
    lowThreshold: MATCH_LOW_THRESHOLD,
  },
  easyPace: "6:30-7:30/km",
};

export type ProgramConfig = typeof DEFAULT_PROGRAM_CONFIG;

export function mergeProgramConfig(raw: unknown): ProgramConfig {
  const incoming = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const taper = (incoming.taper && typeof incoming.taper === "object" ? incoming.taper : {}) as Record<string, unknown>;
  return {
    taper: {
      enabled: taper.enabled !== false,
      strengthVolumeReductionPct: Number(taper.strengthVolumeReductionPct ?? 35),
      runVolumeReductionPct: Number(taper.runVolumeReductionPct ?? 35),
    },
    nerveGlideStages: Array.isArray(incoming.nerveGlideStages)
      ? incoming.nerveGlideStages as ProgramConfig["nerveGlideStages"]
      : [],
    matching: {
      highThreshold: Number(
        (incoming.matching as { highThreshold?: number } | undefined)?.highThreshold ?? MATCH_HIGH_THRESHOLD,
      ),
      lowThreshold: Number(
        (incoming.matching as { lowThreshold?: number } | undefined)?.lowThreshold ?? MATCH_LOW_THRESHOLD,
      ),
    },
    easyPace: typeof incoming.easyPace === "string" ? incoming.easyPace : DEFAULT_PROGRAM_CONFIG.easyPace,
  };
}
