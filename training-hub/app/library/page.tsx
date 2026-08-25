import { Shell } from "../shell";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; modality?: string; equipment?: string; family?: string; knee?: string; shoulder?: string; spine?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "exercises" ? "exercises" : "templates";
  const templates = await prisma.sessionTemplate.findMany({
    where: { ...(params.modality ? { modality: params.modality as never } : {}) },
    orderBy: { name: "asc" },
  });
  const exercises = await prisma.exerciseLibrary.findMany({
    where: {
      ...(params.equipment ? { equipment: params.equipment } : {}),
      ...(params.family ? { family: params.family } : {}),
      ...(params.knee ? { kneeFlag: { not: null } } : {}),
      ...(params.shoulder ? { shoulderFlag: { not: null } } : {}),
      ...(params.spine ? { spineFlag: { not: null } } : {}),
    },
    orderBy: { name: "asc" },
  });

  return (
    <Shell>
      <p className="kicker">Library</p>
      <h2 className="mt-1 text-3xl">{tab === "exercises" ? "Exercises" : "Session templates"}</h2>
      <div className="my-4 flex gap-2 font-sans text-sm">
        <a className="btn btn-quiet" href="/library">Session templates</a>
        <a className="btn btn-quiet" href="/library?tab=exercises">Exercises</a>
      </div>
      <form className="mb-4 flex flex-wrap gap-2 font-sans text-sm" action="/library">
        <input type="hidden" name="tab" value={tab} />
        <input name="modality" placeholder="modality" defaultValue={params.modality ?? ""} className="border border-[var(--line)] px-2 py-2" />
        <input name="equipment" placeholder="equipment" defaultValue={params.equipment ?? ""} className="border border-[var(--line)] px-2 py-2" />
        <input name="family" placeholder="family" defaultValue={params.family ?? ""} className="border border-[var(--line)] px-2 py-2" />
        <label><input type="checkbox" name="knee" defaultChecked={Boolean(params.knee)} /> knee</label>
        <label><input type="checkbox" name="shoulder" defaultChecked={Boolean(params.shoulder)} /> shoulder</label>
        <label><input type="checkbox" name="spine" defaultChecked={Boolean(params.spine)} /> spine</label>
        <button className="btn" type="submit">Filter</button>
      </form>
      <div className="grid gap-2">
        {tab === "templates"
          ? templates.map((template) => (
              <article key={template.id} className="card">
                <p className="kicker">{template.modality}</p>
                <h3 className="m-0">{template.name}</h3>
                <p className="muted font-sans text-sm">Editing this template does not rewrite existing dated snapshots.</p>
              </article>
            ))
          : exercises.map((exercise) => (
              <article key={exercise.id} className="card font-sans text-sm">
                <h3 className="m-0">{exercise.name}</h3>
                <p className="muted m-0">{[exercise.family, exercise.equipment, exercise.kneeFlag, exercise.shoulderFlag, exercise.spineFlag].filter(Boolean).join(" · ")}</p>
              </article>
            ))}
      </div>
    </Shell>
  );
}
