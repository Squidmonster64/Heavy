"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SessionCardProps = {
  session: {
    id: string;
    modality: string;
    templateName?: string | null;
    status: string;
    matchStatus: string;
    minutes: number | null;
    plannedStructure: unknown;
    originalStructure?: unknown;
    notes?: string | null;
  };
  suggestions?: Array<{ name: string; currentKg: number | null; suggestedKg: number | null; reason: string; applyable: boolean }>;
};

export function SessionCard({ session, suggestions = [] }: SessionCardProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setMessage("");
    const response = await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: session.id, action, ...extra }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Action failed");
      return;
    }
    router.refresh();
  }

  async function exportFile(kind: "watchletic" | "seconds" | "heavy") {
    setMessage("");
    const response = await fetch(`/api/exports/${kind}?sessionId=${session.id}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || "Export failed — other sessions remain usable.");
      return;
    }
    if (kind === "watchletic") {
      const body = await response.json();
      if (body.perturbed) setMessage("Watchletic URL slightly perturbed to avoid a slash.");
      window.location.href = body.url;
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.split("filename=")[1]?.replace(/"/g, "") || `${kind}-export`;
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const exportLabel =
    session.modality === "RUN" ? "Download Watchletic" :
    session.modality === "REHAB" ? "Download Seconds" :
    session.modality === "STRENGTH" ? "Download Lift Log" :
    "Open description";

  return (
    <article className="card grid gap-3">
      <div>
        <p className="kicker">{session.modality}</p>
        <h2 className="m-0 text-xl">{session.templateName || session.modality}</h2>
        <p className="muted m-0 mt-1 font-sans text-sm">
          {session.minutes ? `${session.minutes} min` : "Duration unset"} · {session.status.toLowerCase()}
          {session.matchStatus !== "UNMATCHED" ? ` · ${session.matchStatus.toLowerCase().replace("_", " ")}` : ""}
        </p>
      </div>
      {session.originalStructure ? (
        <p className="font-sans text-sm muted">Prescription was modified from the original snapshot (taper, symptom flag, or progression).</p>
      ) : null}
      {session.modality === "CYCLE" ? (
        <pre className="overflow-auto font-sans text-sm whitespace-pre-wrap">{JSON.stringify(session.plannedStructure, null, 2)}</pre>
      ) : (
        <button className="btn btn-wide" type="button" onClick={() => void exportFile(
          session.modality === "RUN" ? "watchletic" : session.modality === "REHAB" ? "seconds" : "heavy",
        )}>
          {exportLabel}
        </button>
      )}
      <div className="flex flex-wrap gap-2 font-sans text-sm">
        <button className="btn btn-quiet" type="button" onClick={() => void act("skip")}>Skip</button>
        <button className="btn btn-quiet" type="button" onClick={() => void act("restore")}>Restore</button>
        <button className="btn btn-quiet" type="button" onClick={() => void act("complete", { completion: { completedAllReps: true, techniqueAccepted: true, rpe: 7 } })}>Mark complete</button>
        <label className="btn btn-quiet">
          Move
          <input
            className="ml-2"
            type="date"
            onChange={(event) => {
              if (event.target.value) void act("move", { date: event.target.value });
            }}
          />
        </label>
      </div>
      {suggestions.map((item) => (
        <div key={item.name} className="border-t border-[var(--line)] pt-3 font-sans text-sm">
          <strong>{item.name}</strong>
          <p className="m-0">Current {item.currentKg ?? "—"} kg · Suggested {item.suggestedKg ?? "—"} kg</p>
          <p className="muted m-0">{item.reason}</p>
          {item.applyable && item.suggestedKg != null ? (
            <button className="btn mt-2" type="button" onClick={() => void act("apply-progression", { name: item.name, weightKg: item.suggestedKg })}>
              Apply {item.suggestedKg} kg
            </button>
          ) : (
            <p className="muted mt-2">Keep {item.currentKg ?? "current"}</p>
          )}
        </div>
      ))}
      {message ? <p className="font-sans text-sm text-[var(--danger)]">{message}</p> : null}
    </article>
  );
}
