export type NerveGlideStage = {
  stage: number;
  start: string;
  end: string;
  templateId: string;
};

export function stageForDate(stages: NerveGlideStage[], dateKey: string) {
  return stages.find((stage) => dateKey >= stage.start && dateKey <= stage.end) ?? null;
}
