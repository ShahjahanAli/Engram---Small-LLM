"use client";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          )}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
