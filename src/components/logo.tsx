import { PRODUCT_NAME } from "@/lib/brand";

/** Original sheep mark: a woolly cloud body with a friendly face. */
export function SheepMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="31" fill="#F6D9C8" />
      <g fill="#FFFDF8" stroke="#4E3626" strokeWidth="2">
        <path d="M17 36c-4 0-6-3-5-6 1-3 4-4 6-3 0-4 4-7 8-5 2-4 7-5 10-2 3-2 8-1 9 3 4-1 7 2 6 6 3 1 4 5 2 7-1 3-4 4-6 3-1 3-5 5-8 3-3 3-8 3-11 0-3 2-7 1-8-2-1 0-2-1-3-4z" />
      </g>
      <g stroke="#4E3626" strokeWidth="3" strokeLinecap="round">
        <line x1="24" y1="44" x2="24" y2="51" />
        <line x1="40" y1="44" x2="40" y2="51" />
      </g>
      <ellipse cx="48" cy="30" rx="7" ry="8.5" fill="#4E3626" />
      <ellipse cx="42.5" cy="25" rx="3.5" ry="2" fill="#4E3626" transform="rotate(-25 42.5 25)" />
      <circle cx="50" cy="28.5" r="1.4" fill="#FFFDF8" />
      <path d="M48 34.5q2 1.5 4 0" stroke="#F6D9C8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-3">
      <SheepMark className="h-11 w-11 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-2xl font-bold text-bark-900">{PRODUCT_NAME}</span>
        {subtitle ? <span className="text-sm text-bark-700">{subtitle}</span> : null}
      </span>
    </span>
  );
}
