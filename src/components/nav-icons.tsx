type IconProps = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const HomeIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <svg {...base} className={className}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
);
export const PeopleIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <svg {...base} className={className}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5c2.3.2 3.9 1.8 4.5 4.5" /></svg>
);
export const GroupsIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="2.5" /><circle cx="8" cy="14.5" r="2" /><circle cx="16" cy="14.5" r="2" /></svg>
);
export const MessagesIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <svg {...base} className={className}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></svg>
);
export const GivingIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <svg {...base} className={className}><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>
);
