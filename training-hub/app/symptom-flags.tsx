"use client";

import { useRouter } from "next/navigation";

export function SymptomFlags({ date, allFlags }: { date: string; allFlags: Record<string, string[]> }) {
  const flags = allFlags[date] ?? [];
  const router = useRouter();

  async function toggle(flag: string, on: boolean) {
    const next = {
      ...allFlags,
      [date]: on ? [...new Set([...flags, flag])] : flags.filter((item) => item !== flag),
    };
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "athlete.symptomFlagsByDate": JSON.stringify(next) }),
    });
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-3 font-sans text-sm">
      {["knee", "shoulder", "other"].map((flag) => (
        <label key={flag} className="flex items-center gap-2">
          <input type="checkbox" defaultChecked={flags.includes(flag)} onChange={(event) => void toggle(flag, event.target.checked)} />
          {flag} flag
        </label>
      ))}
    </div>
  );
}
