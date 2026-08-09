"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const OPTIONS: { id: "gru" | "lstm"; label: string; hint: string }[] = [
  { id: "gru", label: "GRU", hint: "Faster, fewer params" },
  { id: "lstm", label: "LSTM", hint: "Richer memory gates" },
];

export function ArchitecturePicker({
  value,
  onChange,
  disabled,
}: {
  value: "gru" | "lstm";
  onChange: (v: "gru" | "lstm") => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <Label className="mb-2 block">Architecture</Label>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Architecture">
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-left transition",
                active
                  ? "border-teal-500/60 bg-teal-500/10 text-teal-100"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-600",
                disabled && "opacity-50"
              )}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[10px] text-zinc-500">{opt.hint}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">
        Self-attention is a stretch goal — GRU/LSTM for v1.
      </p>
    </fieldset>
  );
}
