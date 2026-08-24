"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncControls({
  connected,
  athlete,
  lastPush,
  lastPull,
  lastTest,
}: {
  connected: boolean;
  athlete: string;
  lastPush: string | null;
  lastPull: string | null;
  lastTest: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function call(path: string, label: string) {
    setMessage(`${label}…`);
    const response = await fetch(path, { method: path.includes("test") ? "GET" : "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(body.error || `${label} failed`);
    else setMessage(`${label} ok`);
    router.refresh();
  }

  return (
    <section className="card grid gap-3">
      <p className="kicker">Intervals.icu</p>
      <p className="m-0">Connection {connected ? "Connected" : "Not connected"}</p>
      <p className="m-0">Athlete {athlete}</p>
      <p className="muted m-0 font-sans text-sm">Last test {lastTest ?? "—"}</p>
      <p className="muted m-0 font-sans text-sm">Last push {lastPush ?? "—"}</p>
      <p className="muted m-0 font-sans text-sm">Last pull {lastPull ?? "—"}</p>
      <div className="grid gap-2">
        <button className="btn" type="button" onClick={() => void call("/api/integrations/intervals/push", "Push plan")}>Push plan</button>
        <button className="btn btn-quiet" type="button" onClick={() => void call("/api/integrations/intervals/pull", "Pull actuals")}>Pull actuals</button>
        <button className="btn btn-quiet" type="button" onClick={() => void call("/api/integrations/intervals/sync", "Sync now")}>Sync now</button>
        <button className="btn btn-quiet" type="button" onClick={() => void call("/api/integrations/intervals/test", "Test connection")}>Test connection</button>
      </div>
      {message ? <p className="font-sans text-sm">{message}</p> : null}
    </section>
  );
}
