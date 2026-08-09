"use client";

import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";

export function ProbabilityBars() {
  const topProbs = useAppStore((s) => s.topProbs);

  return (
    <Panel title="Next-token probs" description="Top-N model probabilities (pre-temperature)">
      <div className="space-y-1.5">
        {topProbs.length === 0 && (
          <p className="text-xs text-zinc-600">Probabilities appear during generation</p>
        )}
        {topProbs.map((p) => {
          const label = p.char === "\n" ? "\\n" : p.char === " " ? "␣" : p.char;
          const pct = Math.round(p.prob * 1000) / 10;
          return (
            <div key={p.index} className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-2">
              <span className="font-mono text-xs text-teal-300">{label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-teal-500/80 transition-all duration-150"
                  style={{ width: `${Math.min(100, p.prob * 100)}%` }}
                />
              </div>
              <span className="text-right font-mono text-[10px] text-zinc-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
