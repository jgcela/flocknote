import Link from "next/link";
import type { ReactNode } from "react";
import { SheepMark } from "./logo";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-bark-700">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-bark-700">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold text-bark-900">{value}</p>
      {hint ? <p className="mt-1 text-bark-700">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <SheepMark className="h-16 w-16" />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      {children ? <div className="mt-2 max-w-md text-bark-700">{children}</div> : null}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-cream-200 text-bark-900",
  good: "bg-meadow-100 text-meadow-700",
  warm: "bg-clay-100 text-clay-700",
  info: "bg-sky-50 text-sky-700",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`badge ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function SubNav({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Section" className="mb-6 flex gap-2 border-b-2 border-cream-300">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "-mb-0.5 border-b-4 px-4 py-3 font-semibold no-underline",
              active ? "border-clay-600 text-bark-900" : "border-transparent text-bark-700 hover:text-bark-900",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
