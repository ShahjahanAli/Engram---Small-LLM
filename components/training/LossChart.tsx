"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";

export function LossChart() {
  const lossHistory = useAppStore((s) => s.trainingState.lossHistory);

  return (
    <Panel title="Loss" description="Updates once per epoch">
      <div className="h-48 w-full">
        {lossHistory.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            Loss curve appears when training starts
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lossHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis
                dataKey="epoch"
                stroke="#71717a"
                tick={{ fontSize: 10 }}
                label={{ value: "epoch", position: "insideBottomRight", offset: -4, fill: "#52525b", fontSize: 10 }}
              />
              <YAxis stroke="#71717a" tick={{ fontSize: 10 }} width={40} />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="loss"
                stroke="#2dd4bf"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
