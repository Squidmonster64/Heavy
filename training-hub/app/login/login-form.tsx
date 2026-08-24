"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const passcode = new FormData(event.currentTarget).get("passcode");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setPending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Could not sign in");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-1 font-sans text-sm">
        Passcode
        <input className="min-h-12 border border-[var(--ink)] bg-white px-3" name="passcode" type="password" autoFocus required />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-wide" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Enter"}
      </button>
    </form>
  );
}
