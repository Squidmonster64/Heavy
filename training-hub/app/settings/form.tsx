"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm(props: {
  athlete: string;
  ftp: string;
  ftpStale: boolean;
  rollingFtp: string;
  lthr: string;
  maxHr: string;
  taperPct: string;
  timezone: string;
  lastTest: string | null;
  connected: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [ "intervals.athleteId" ]: data.get("athlete"),
        [ "thresholds.ftp" ]: data.get("ftp"),
        [ "thresholds.ftpStale" ]: data.get("ftpStale") ? "true" : "false",
        [ "thresholds.rollingFtp" ]: data.get("rollingFtp"),
        [ "thresholds.lthr" ]: data.get("lthr"),
        [ "thresholds.maxHr" ]: data.get("maxHr"),
        [ "taper.defaultPct" ]: data.get("taperPct"),
        [ "athlete.timezone" ]: data.get("timezone"),
      }),
    });
    setMessage(response.ok ? "Saved" : "Save failed");
    router.refresh();
  }

  async function test() {
    const response = await fetch("/api/integrations/intervals/test");
    const body = await response.json().catch(() => ({}));
    setMessage(body.connected ? `Connected as ${body.athlete}` : body.error || "Test failed");
    router.refresh();
  }

  return (
    <form className="card grid gap-3 font-sans text-sm" onSubmit={(event) => void save(event)}>
      <p className="kicker">Intervals.icu</p>
      <p className="m-0">Status {props.connected ? "Connected" : "Not connected"}</p>
      <p className="m-0">Athlete {props.athlete}</p>
      <p className="muted m-0">Last test {props.lastTest ?? "—"}</p>
      <button className="btn" type="button" onClick={() => void test()}>Test connection</button>
      <label className="grid gap-1">
        Athlete ID
        <input className="min-h-11 border border-[var(--line)] px-2" name="athlete" defaultValue={props.athlete} />
      </label>
      <label className="grid gap-1">
        FTP
        <input className="min-h-11 border border-[var(--line)] px-2" name="ftp" defaultValue={props.ftp} />
      </label>
      {props.ftpStale ? <p className="m-0 text-[var(--danger)]">FTP 144 is labelled Possibly stale and is not used invisibly.</p> : null}
      <label className="flex items-center gap-2">
        <input type="checkbox" name="ftpStale" defaultChecked={props.ftpStale} /> Possibly stale
      </label>
      <label className="grid gap-1">
        Rolling FTP estimate
        <input className="min-h-11 border border-[var(--line)] px-2" name="rollingFtp" defaultValue={props.rollingFtp} />
      </label>
      <label className="grid gap-1">
        LTHR
        <input className="min-h-11 border border-[var(--line)] px-2" name="lthr" defaultValue={props.lthr} />
      </label>
      <label className="grid gap-1">
        Max HR
        <input className="min-h-11 border border-[var(--line)] px-2" name="maxHr" defaultValue={props.maxHr} />
      </label>
      <label className="grid gap-1">
        Default taper %
        <input className="min-h-11 border border-[var(--line)] px-2" name="taperPct" defaultValue={props.taperPct} />
      </label>
      <label className="grid gap-1">
        Timezone
        <input className="min-h-11 border border-[var(--line)] px-2" name="timezone" defaultValue={props.timezone} />
      </label>
      <p className="muted">The Intervals API key is environment-backed and is not shown or returned by this page.</p>
      <button className="btn" type="submit">Save settings</button>
      {message ? <p>{message}</p> : null}
      <a className="btn btn-quiet" href="/api/coach/context">Download coach context</a>
    </form>
  );
}
