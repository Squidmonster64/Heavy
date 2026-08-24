import { DEFAULT_HORIZON_WEEKS, mergeProgramConfig } from "@/lib/config";
import { addDays, dateKeyFromStored, dateKeysInclusive, horizonEnd, isoWeekdayFromDateKey } from "@/lib/dates";
import { parseStructure, type Modality } from "@/lib/validation/structures";
import { snapshotStructure } from "./clone";
import { stageForDate } from "./nerve-glide";
import { applySymptomFlags } from "./pyramid";
import { applyTaperToRun, applyTaperToStrength, isTaperDate } from "./taper";
import type { StrengthStructure, RunStructure } from "@/lib/validation/structures";

export type ProgramDayInput = {
  dayOfWeek: number;
  modality: Modality;
  templateId?: string | null;
};

export type TemplateInput = {
  id: string;
  name: string;
  modality: Modality;
  structure: unknown;
};

export type ExistingSession = {
  programId: string;
  date: string;
  modality: Modality;
  templateId?: string | null;
};

export type GeneratedSession = {
  date: string;
  modality: Modality;
  templateId: string | null;
  templateName: string | null;
  plannedStructure: unknown;
  originalStructure: unknown | null;
};

export function generateDatedSessions(options: {
  programId: string;
  startDate: string;
  horizonWeeks?: number;
  days: ProgramDayInput[];
  templates: TemplateInput[];
  existing: ExistingSession[];
  config?: unknown;
  taperStart?: string | null;
  symptomFlagsByDate?: Record<string, string[]>;
  fromDate?: string;
}): GeneratedSession[] {
  const config = mergeProgramConfig(options.config);
  const start = options.fromDate && options.fromDate > options.startDate ? options.fromDate : options.startDate;
  const end = horizonEnd(options.startDate, options.horizonWeeks ?? DEFAULT_HORIZON_WEEKS);
  const existing = new Set(
    options.existing.map((session) => `${session.date}|${session.modality}|${session.templateId ?? ""}`),
  );
  const templates = new Map(options.templates.map((template) => [template.id, template]));
  const generated: GeneratedSession[] = [];

  for (const date of dateKeysInclusive(start, end)) {
    const weekday = isoWeekdayFromDateKey(date);
    const dayRows = options.days.filter((day) => day.dayOfWeek === weekday);
    for (const day of dayRows) {
      let templateId = day.templateId ?? null;
      if (day.modality === "REHAB") {
        const stage = stageForDate(config.nerveGlideStages, date);
        if (stage?.templateId) templateId = stage.templateId;
      }
      const key = `${date}|${day.modality}|${templateId ?? ""}`;
      if (existing.has(key)) continue;
      const template = templateId ? templates.get(templateId) : undefined;
      if (!template) continue;
      const parsed = parseStructure(template.modality, template.structure);
      const original = snapshotStructure(parsed);
      let planned: unknown = snapshotStructure(parsed);
      const tapering = isTaperDate(date, options.taperStart ? dateKeyFromStored(new Date(options.taperStart)) : options.taperStart, config.taper.enabled);
      if (tapering && template.modality === "STRENGTH") {
        planned = applyTaperToStrength(planned as StrengthStructure, config.taper.strengthVolumeReductionPct);
      }
      if (tapering && template.modality === "RUN") {
        planned = applyTaperToRun(planned as RunStructure, config.taper.runVolumeReductionPct);
      }
      if (template.modality === "STRENGTH") {
        planned = applySymptomFlags(planned as StrengthStructure, options.symptomFlagsByDate?.[date] ?? []);
      }
      generated.push({
        date,
        modality: template.modality,
        templateId: template.id,
        templateName: template.name,
        plannedStructure: planned,
        originalStructure: JSON.stringify(planned) === JSON.stringify(original) ? null : original,
      });
      existing.add(key);
    }
  }
  return generated;
}

export function rollingHorizonStart(today: string, programStart: string) {
  return today > programStart ? today : programStart;
}

export { addDays };
