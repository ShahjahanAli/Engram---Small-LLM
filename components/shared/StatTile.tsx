"use client";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2",
        className
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-teal-300">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-zinc-600">{hint}</div>}
    </div>
  );
}
