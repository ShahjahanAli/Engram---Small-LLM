"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  formatValue?: (v: number) => string;
}

export function Slider({
  className,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  formatValue,
  id,
  disabled,
  ...props
}: SliderProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={cn("space-y-2", className)}>
      {(label || formatValue) && (
        <div className="flex items-center justify-between text-xs text-zinc-400">
          {label && (
            <label htmlFor={inputId} className="font-medium text-zinc-300">
              {label}
            </label>
          )}
          <span className="font-mono text-teal-300/90">
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label ?? props["aria-label"]}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </div>
  );
}
