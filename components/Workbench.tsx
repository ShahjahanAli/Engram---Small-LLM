"use client";

import { useEffect, useState } from "react";
import { CorpusInput } from "@/components/corpus/CorpusInput";
import { CorpusStats } from "@/components/corpus/CorpusStats";
import { ModelConfigPanel } from "@/components/model-config/ModelConfigPanel";
import { TrainingControls } from "@/components/training/TrainingControls";
import { LossChart } from "@/components/training/LossChart";
import { TrainingLog } from "@/components/training/TrainingLog";
import { GenerationPanel } from "@/components/generation/GenerationPanel";
import { GeneratedOutput } from "@/components/generation/GeneratedOutput";
import { ProbabilityBars } from "@/components/generation/ProbabilityBars";
import { NetworkActivityCanvas } from "@/components/visualization/NetworkActivityCanvas";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  loadCorpus,
  loadTrainedModel,
  hasSavedModel,
  clearSavedModel,
} from "@/lib/persistence/modelStorage";
import { loadPreset } from "@/lib/persistence/corpusPresets";
import {
  disposeModel,
  getBackendInfo,
  getModel,
  initTfBackend,
} from "@/lib/model/modelRegistry";
import { countParams } from "@/lib/model/modelBuilder";

export function Workbench() {
  const setCorpus = useAppStore((s) => s.setCorpus);
  const setModelConfig = useAppStore((s) => s.setModelConfig);
  const setTrainingState = useAppStore((s) => s.setTrainingState);
  const resetTraining = useAppStore((s) => s.resetTraining);
  const setParamCount = useAppStore((s) => s.setParamCount);
  const setGenerationConfig = useAppStore((s) => s.setGenerationConfig);
  const backendWarning = useAppStore((s) => s.trainingState.backendWarning);
  const modelPersisted = useAppStore((s) => s.modelPersisted);
  const setModelPersisted = useAppStore((s) => s.setModelPersisted);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { backend, warning } = await initTfBackend();
      if (!cancelled) {
        setTrainingState({
          backend,
          backendWarning: warning,
        });
      }

      const savedCorpus = await loadCorpus();
      if (!cancelled && savedCorpus) {
        setCorpus(savedCorpus);
      } else if (!cancelled && !savedCorpus) {
        try {
          const sample = await loadPreset("/samples/nursery.txt");
          setCorpus(sample);
        } catch {
          // ignore
        }
      }

      const exists = await hasSavedModel();
      if (!cancelled) setModelPersisted(exists);

      if (exists) {
        const meta = await loadTrainedModel();
        if (!cancelled && meta) {
          setModelConfig(meta.config);
          setParamCount(meta.paramCount || (getModel() ? countParams(getModel()!) : 0));
          setTrainingState({
            status: "trained",
            vocabSize: meta.vocab.size,
            totalEpochs: meta.config.epochs,
            currentEpoch: meta.config.epochs,
            backend: getBackendInfo().backend ?? backend,
            backendWarning: getBackendInfo().warning ?? warning,
          });
          if (!useAppStore.getState().generationConfig.prompt) {
            setGenerationConfig({ prompt: "Twinkle" });
          }
        } else if (!cancelled) {
          setModelPersisted(false);
          await clearSavedModel();
        }
      }

      if (!cancelled) setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    setCorpus,
    setModelConfig,
    setTrainingState,
    setParamCount,
    setGenerationConfig,
    setModelPersisted,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-zinc-800/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-teal-500/80">
            in-browser · tensorflow.js
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            Engram
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Train a tiny character-level language model in your browser, watch the
            loss fall, then generate text and inspect neuron activations live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modelPersisted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await clearSavedModel();
                disposeModel();
                resetTraining();
                setModelPersisted(false);
                setParamCount(0);
              }}
            >
              Clear saved model
            </Button>
          )}
          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-500">
            {hydrated ? "ready" : "loading…"}
          </span>
        </div>
      </header>

      {backendWarning && (
        <p
          role="status"
          className="rounded-md border border-amber-700/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200"
        >
          {backendWarning}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <CorpusInput />
          <CorpusStats />
          <ModelConfigPanel />
          <TrainingControls />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <LossChart />
          <TrainingLog />
          <GenerationPanel />
          <ProbabilityBars />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GeneratedOutput />
          <NetworkActivityCanvas />
        </div>
      </div>
    </div>
  );
}
