"use client";

import { useEffect, useRef } from "react";
import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";

export function TrainingLog() {
  const lossHistory = useAppStore((s) => s.trainingState.lossHistory);
  const status = useAppStore((s) => s.trainingState.status);
  const errorMessage = useAppStore((s) => s.trainingState.errorMessage);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lossHistory.length, status]);

  return (
    <Panel title="Training log" description="Epoch-by-epoch">
      <div className="h-40 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/70 p-2 font-mono text-[11px] leading-5 text-zinc-400">
        {lossHistory.length === 0 && status === "idle" && (
          <div className="text-zinc-600">Waiting for training…</div>
        )}
        {lossHistory.map((row) => (
          <div key={row.epoch}>
            epoch {String(row.epoch).padStart(3, " ")}  loss={row.loss.toFixed(4)}
          </div>
        ))}
        {status === "trained" && <div className="text-teal-400">✓ training complete</div>}
        {status === "paused" && <div className="text-amber-300">⏸ paused</div>}
        {status === "error" && errorMessage && (
          <div className="text-rose-400">✗ {errorMessage}</div>
        )}
        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}
