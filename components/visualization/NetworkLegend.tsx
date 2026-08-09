"use client";

export function NetworkLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-teal-400" aria-hidden /> active
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden /> negative
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full border-2 border-amber-400" aria-hidden />{" "}
        sampled
      </span>
    </div>
  );
}
