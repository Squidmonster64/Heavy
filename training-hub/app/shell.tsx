import Link from "next/link";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/program", label: "Program" },
  { href: "/library", label: "Library" },
  { href: "/sync", label: "Sync" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-5">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Adaptive Fitness</p>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Training Hub</h1>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn btn-quiet" type="submit">Sign out</button>
        </form>
      </header>
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3 font-sans text-sm">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="px-2 py-1">
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
