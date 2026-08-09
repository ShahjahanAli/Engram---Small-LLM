"use client";

import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";

export function GeneratedOutput() {
  const text = useAppStore((s) => s.generatedText);
  const isGenerating = useAppStore((s) => s.isGenerating);

  return (
    <Panel title="Output" description="Streaming generation">
      <div
        aria-live="polite"
        className="min-h-40 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-sm leading-relaxed text-zinc-200"
      >
        {text || (
          <span className="text-zinc-600">Generated text will stream here…</span>
        )}
        {isGenerating && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-teal-400 align-middle" />
        )}
      </div>
    </Panel>
  );
}
