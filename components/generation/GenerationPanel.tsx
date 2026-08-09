"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";
import { generateText } from "@/lib/model/generator";

export function GenerationPanel() {
  const config = useAppStore((s) => s.generationConfig);
  const setGenerationConfig = useAppStore((s) => s.setGenerationConfig);
  const setGeneratedText = useAppStore((s) => s.setGeneratedText);
  const appendGeneratedText = useAppStore((s) => s.appendGeneratedText);
  const setTopProbs = useAppStore((s) => s.setTopProbs);
  const setActivationSnapshot = useAppStore((s) => s.setActivationSnapshot);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const trainingStatus = useAppStore((s) => s.trainingState.status);
  const seqLen = useAppStore((s) => s.modelConfig.seqLen);
  const generationError = useAppStore((s) => s.generationError);
  const setGenerationError = useAppStore((s) => s.setGenerationError);
  const stopRef = useRef(false);

  const canGenerate =
    (trainingStatus === "trained" || trainingStatus === "paused") && !isGenerating;

  const run = async () => {
    stopRef.current = false;
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedText(config.prompt);
    setTopProbs([]);
    setActivationSnapshot(null);

    try {
      await generateText(config, seqLen, {
        shouldStop: () => stopRef.current,
        probeEvery: 3,
        onToken: (char, tops, snap) => {
          appendGeneratedText(char);
          setTopProbs(tops);
          if (snap) setActivationSnapshot(snap);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setGenerationError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Panel title="Generate" description="Temperature sampling from the trained model">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="prompt">Prompt</Label>
          <Input
            id="prompt"
            value={config.prompt}
            disabled={isGenerating}
            placeholder="Optional seed text…"
            onChange={(e) => setGenerationConfig({ prompt: e.target.value })}
          />
        </div>

        <Slider
          label="Length"
          min={20}
          max={500}
          step={10}
          value={config.length}
          disabled={isGenerating}
          onValueChange={(length) => setGenerationConfig({ length })}
        />

        <Slider
          label="Temperature"
          min={0.1}
          max={2}
          step={0.05}
          value={config.temperature}
          disabled={isGenerating}
          formatValue={(v) => v.toFixed(2)}
          onValueChange={(temperature) => setGenerationConfig({ temperature })}
        />

        <div className="flex gap-2">
          <Button type="button" onClick={() => void run()} disabled={!canGenerate}>
            {isGenerating ? "Generating…" : "Generate"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!isGenerating}
            onClick={() => {
              stopRef.current = true;
            }}
          >
            Stop
          </Button>
        </div>

        {trainingStatus !== "trained" && trainingStatus !== "paused" && (
          <p className="text-xs text-zinc-500">Train a model first to unlock generation.</p>
        )}

        {generationError && (
          <p
            role="alert"
            className="rounded-md border border-rose-700/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
          >
            {generationError}
          </p>
        )}
      </div>
    </Panel>
  );
}
