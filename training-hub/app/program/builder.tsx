"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Day = { id: string; dayOfWeek: number; modality: string; templateId: string | null };
type Template = { id: string; name: string; modality: string };
type Session = {
  id: string;
  date: string;
  modality: string;
  templateName: string | null;
  status: string;
};

export function ProgramBuilder({
  program,
  templates,
  sessions,
}: {
  program: {
    id: string;
    name: string;
    startDate: string;
    taperStart: string | null;
    raceDate: string | null;
    config: unknown;
    days: Day[];
  } | null;
  templates: Template[];
  sessions: Session[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function patchProgram(payload: Record<string, unknown>) {
    if (!program) return;
    const response = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) setMessage("Could not update program");
    else router.refresh();
  }

  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    if (!response.ok) setMessage("Could not update session");
    else router.refresh();
  }

  if (!program) return <p>Create a program to use the builder.</p>;

  const weeks = new Map<string, Session[]>();
  for (const session of sessions) {
    const list = weeks.get(session.date) ?? [];
    list.push(session);
    weeks.set(session.date, list);
  }

  return (
    <div className="grid gap-6">
      <form
        className="card grid gap-3 font-sans text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void patchProgram({
            name: data.get("name"),
            taperStart: data.get("taperStart") || null,
            raceDate: data.get("raceDate") || null,
            regenerate: true,
          });
        }}
      >
        <label className="grid gap-1">
          Program name
          <input className="min-h-11 border border-[var(--line)] px-2" name="name" defaultValue={program.name} />
        </label>
        <label className="grid gap-1">
          Race date
          <input className="min-h-11 border border-[var(--line)] px-2" type="date" name="raceDate" defaultValue={program.raceDate ?? ""} />
        </label>
        <label className="grid gap-1">
          Taper start
          <input className="min-h-11 border border-[var(--line)] px-2" type="date" name="taperStart" defaultValue={program.taperStart ?? ""} />
        </label>
        <p className="muted">Editing a dated session does not change its template. Use the library to edit templates for future sessions.</p>
        <button className="btn" type="submit">Save program dates</button>
      </form>

      <section>
        <h2 className="text-xl">Weekly intent</h2>
        <div className="grid gap-2">
          {WEEKDAYS.map((label, index) => {
            const iso = index + 1;
            const rows = program.days.filter((day) => day.dayOfWeek === iso);
            return (
              <div key={label} className="card font-sans text-sm">
                <strong>{label}</strong>
                <p className="m-0 muted">{rows.length ? rows.map((row) => row.modality).join(" + ") : "REST"}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xl">Calendar</h2>
        {[...weeks.entries()].map(([date, list]) => (
          <div key={date} className="card font-sans text-sm">
            <strong>{date}</strong>
            {list.map((session) => (
              <div key={session.id} className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2">
                <span>{session.modality} · {session.templateName} · {session.status.toLowerCase()}</span>
                <button className="btn btn-quiet" type="button" onClick={() => void act(session.id, "skip")}>Skip</button>
                <button className="btn btn-quiet" type="button" onClick={() => void act(session.id, "restore")}>Restore</button>
                <label>
                  Move
                  <input className="ml-1" type="date" onChange={(event) => event.target.value && void act(session.id, "move", { date: event.target.value })} />
                </label>
                <label>
                  Replace template
                  <select
                    className="ml-1 border border-[var(--line)]"
                    defaultValue=""
                    onChange={(event) => event.target.value && void act(session.id, "replace-template", { templateId: event.target.value })}
                  >
                    <option value="">Edit this session only via replace</option>
                    {templates.filter((template) => template.modality === session.modality).map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        ))}
      </section>
      {message ? <p className="text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}
