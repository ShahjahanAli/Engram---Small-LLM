"use client";

import { useEffect, useRef } from "react";
import { Panel } from "@/components/shared/Panel";
import { NetworkLegend } from "@/components/visualization/NetworkLegend";
import { useAppStore } from "@/lib/store/useAppStore";
import type { ActivationSnapshot } from "@/lib/types";

function sampleIndices(length: number, maxNodes: number): number[] {
  if (length <= maxNodes) return Array.from({ length }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < maxNodes; i++) {
    out.push(Math.floor((i * (length - 1)) / (maxNodes - 1)));
  }
  return out;
}

function activationColor(v: number, maxAbs: number): string {
  const t = maxAbs === 0 ? 0 : Math.max(-1, Math.min(1, v / maxAbs));
  if (t >= 0) {
    const g = Math.round(80 + t * 140);
    const b = Math.round(100 + t * 80);
    return `rgb(45, ${g}, ${b})`;
  }
  const r = Math.round(80 + Math.abs(t) * 140);
  return `rgb(${r}, 70, 90)`;
}

function drawNetwork(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snap: ActivationSnapshot | null,
  archLabel: string
) {
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#0c1220");
  grad.addColorStop(1, "#0a0f14");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (!snap) {
    ctx.fillStyle = "#52525b";
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("Activations appear during generation", width / 2, height / 2);
    return;
  }

  const topOut = snap.outputProbs
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 10);

  const layers = [
    {
      name: "input",
      values: snap.inputChars.map((_, i) => (i + 1) / snap.inputChars.length),
      labels: snap.inputChars,
      tokenIds: null as number[] | null,
      maxNodes: 24,
      isChar: true,
    },
    {
      name: "embed",
      values: snap.embedVector,
      labels: null as string[] | null,
      tokenIds: null as number[] | null,
      maxNodes: 22,
      isChar: false,
    },
    {
      name: "hidden",
      values: snap.hiddenVector,
      labels: null as string[] | null,
      tokenIds: null as number[] | null,
      maxNodes: 26,
      isChar: false,
    },
    {
      name: "output",
      values: topOut.map((x) => x.p),
      labels: topOut.map((x) => String(x.i)),
      tokenIds: topOut.map((x) => x.i),
      maxNodes: 10,
      isChar: false,
    },
  ];

  const xs = [width * 0.12, width * 0.36, width * 0.6, width * 0.84];
  const nodeSets: { x: number; y: number; r: number; color: string; tokenId?: number }[][] =
    [];

  layers.forEach((layer, li) => {
    const idxs = sampleIndices(layer.values.length, layer.maxNodes);
    const nodes: { x: number; y: number; r: number; color: string; tokenId?: number }[] =
      [];
    const maxAbs = Math.max(...layer.values.map((v) => Math.abs(v)), 1e-6);
    const span = height * 0.72;
    const top = height * 0.14;

    idxs.forEach((idx, ni) => {
      const y =
        idxs.length === 1 ? height / 2 : top + (ni / (idxs.length - 1)) * span;
      const v = layer.values[idx] ?? 0;
      const r = layer.name === "output" ? 4 + v * 8 : 4;
      const color =
        layer.name === "output"
          ? `rgba(45, 212, 191, ${0.35 + v * 0.65})`
          : activationColor(v, maxAbs);
      nodes.push({
        x: xs[li],
        y,
        r,
        color,
        tokenId: layer.tokenIds?.[idx],
      });

      if (layer.isChar && layer.labels) {
        const ch = layer.labels[idx] ?? "";
        const label = ch === "\n" ? "↵" : ch === " " ? "·" : ch;
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText(label, xs[li] - 10, y + 3);
      }
    });

    nodeSets.push(nodes);

    ctx.fillStyle = "#71717a";
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    const dimLabel =
      layer.name === "output"
        ? `top-10 / ${snap.outputProbs.length}`
        : `${idxs.length} of ${layer.values.length}`;
    ctx.fillText(`${layer.name} (${dimLabel})`, xs[li], height - 14);
  });

  for (let li = 0; li < nodeSets.length - 1; li++) {
    const a = nodeSets[li];
    const b = nodeSets[li + 1];
    ctx.strokeStyle = "rgba(113, 113, 122, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < a.length; i += Math.max(1, Math.floor(a.length / 8))) {
      for (let j = 0; j < b.length; j += Math.max(1, Math.floor(b.length / 8))) {
        ctx.beginPath();
        ctx.moveTo(a[i].x, a[i].y);
        ctx.lineTo(b[j].x, b[j].y);
        ctx.stroke();
      }
    }
  }

  nodeSets.forEach((nodes) => {
    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.fillStyle = n.color;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Highlight the actually sampled token when it appears in the top-10
  const outNodes = nodeSets[3];
  const sampledNode =
    outNodes.find((n) => n.tokenId === snap.sampledIndex) ?? outNodes[0];
  if (sampledNode) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sampledNode.x, sampledNode.y, sampledNode.r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#52525b";
  ctx.font = "10px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    `arch: ${archLabel}  ·  sampled #${snap.sampledIndex}  ·  diagram is a subsample`,
    12,
    16
  );
}

export function NetworkActivityCanvas() {
  const snap = useAppStore((s) => s.activationSnapshot);
  const arch = useAppStore((s) => s.modelConfig.architecture);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef(snap);
  const archRef = useRef(arch);
  snapRef.current = snap;
  archRef.current = arch;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const redraw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawNetwork(
        ctx,
        rect.width,
        rect.height,
        snapRef.current,
        archRef.current.toUpperCase()
      );
    };

    redraw();

    const ro = new ResizeObserver(() => redraw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [snap, arch]);

  const liveLabel = snap
    ? `Network activations: ${snap.inputChars.length} inputs, sampled token index ${snap.sampledIndex}`
    : "Network activation diagram idle";

  return (
    <Panel
      title="Network activity"
      description="Input → embedding → RNN hidden → output distribution"
      actions={<NetworkLegend />}
    >
      <canvas
        ref={canvasRef}
        className="h-72 w-full rounded-md border border-zinc-800"
        role="img"
        aria-label={liveLabel}
      />
      <p className="sr-only" aria-live="polite">
        {liveLabel}
      </p>
    </Panel>
  );
}
