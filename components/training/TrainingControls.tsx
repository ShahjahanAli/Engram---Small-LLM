"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";
import { buildVocab } from "@/lib/model/tokenizer";
import { buildModel, countParams } from "@/lib/model/modelBuilder";
import { MAX_TRAIN_SAMPLES, trainModel, yieldToUi } from "@/lib/model/trainer";
import {
  disposeModel,
  getModel,
  getVocab,
  initTfBackend,
  setModel,
} from "@/lib/model/modelRegistry";
import { saveTrainedModel } from "@/lib/persistence/modelStorage";

export function TrainingControls() {
  const corpus = useAppStore((s) => s.corpus);
  const config = useAppStore((s) => s.modelConfig);
  const setModelConfig = useAppStore((s) => s.setModelConfig);
  const training = useAppStore((s) => s.trainingState);
  const setTrainingState = useAppStore((s) => s.setTrainingState);
  const pushLoss = useAppStore((s) => s.pushLoss);
  const resetTraining = useAppStore((s) => s.resetTraining);
  const setParamCount = useAppStore((s) => s.setParamCount);
  const setGeneratedText = useAppStore((s) => s.setGeneratedText);
  const setActivationSnapshot = useAppStore((s) => s.setActivationSnapshot);
  const setTopProbs = useAppStore((s) => s.setTopProbs);
  const paramCount = useAppStore((s) => s.paramCount);
  const setModelPersisted = useAppStore((s) => s.setModelPersisted);

  const stopRef = useRef(false);
  const epochOffsetRef = useRef(0);

  const isRunning = training.status === "training" || training.status === "preparing";
  const canResume = training.status === "paused" && Boolean(getModel());

  const start = async (resume = false) => {
    stopRef.current = false;
    if (!resume) {
      setGeneratedText("");
      setTopProbs([]);
      setActivationSnapshot(null);
      epochOffsetRef.current = 0;
    } else {
      epochOffsetRef.current = training.currentEpoch;
    }

    try {
      const { backend, warning } = await initTfBackend();
      setTrainingState({
        status: "preparing",
        ...(resume
          ? {}
          : {
              currentEpoch: 0,
              lossHistory: [],
            }),
        totalEpochs: config.epochs + (resume ? epochOffsetRef.current : 0),
        errorMessage: undefined,
        backend,
        backendWarning: warning,
        batchProgress: undefined,
        sampleCount: undefined,
        totalPossibleSamples: undefined,
        samplesCapped: undefined,
      });

      // Let React paint "preparing" before heavy sync work
      await yieldToUi();

      if (corpus.length < config.seqLen + 1) {
        throw new Error(
          `Corpus too short: need at least ${config.seqLen + 1} characters (have ${corpus.length}).`
        );
      }

      let model = resume ? getModel() : null;
      let vocab = resume ? getVocab() : null;

      if (!resume || !model || !vocab) {
        vocab = buildVocab(corpus);
        if (vocab.size < 2) {
          throw new Error("Vocabulary too small — need at least 2 unique characters.");
        }
        await yieldToUi();
        disposeModel();
        model = buildModel(config, vocab.size);
        setModel(model, vocab);
        setParamCount(countParams(model));
        await yieldToUi();
      }

      setTrainingState({ status: "training", vocabSize: vocab.size });
      await yieldToUi();

      await trainModel(model, corpus, vocab, config, {
        shouldStop: () => stopRef.current,
        onPrepared: ({ sampleCount, totalPossible, capped }) => {
          setTrainingState({
            sampleCount,
            totalPossibleSamples: totalPossible,
            samplesCapped: capped,
          });
        },
        onBatchEnd: (batch, total) => {
          setTrainingState({ batchProgress: { batch, total } });
        },
        onEpochEnd: (epoch, loss) => {
          pushLoss(epochOffsetRef.current + epoch, loss);
          setTrainingState({ batchProgress: undefined });
        },
      });

      if (stopRef.current) {
        setTrainingState({ status: "paused", batchProgress: undefined });
      } else {
        setTrainingState({ status: "trained", batchProgress: undefined });
        try {
          await saveTrainedModel(config, vocab, countParams(model));
          setModelPersisted(true);
        } catch {
          // persistence failure shouldn't block training success
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Training failed";
      setTrainingState({ status: "error", errorMessage: message, batchProgress: undefined });
    }
  };

  const pause = () => {
    stopRef.current = true;
  };

  const reset = () => {
    stopRef.current = true;
    disposeModel();
    resetTraining();
  };

  const save = async () => {
    const vocab = getVocab();
    const model = getModel();
    if (!vocab || !model) return;
    try {
      await saveTrainedModel(config, vocab, paramCount || countParams(model));
      setModelPersisted(true);
      setTrainingState({ errorMessage: undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setTrainingState({ errorMessage: message });
    }
  };

  const startLabel = isRunning
    ? "Training…"
    : canResume
      ? "Resume"
      : training.status === "trained"
        ? "Retrain"
        : "Start";

  const batchPct =
    training.batchProgress && training.batchProgress.total > 0
      ? Math.round((training.batchProgress.batch / training.batchProgress.total) * 100)
      : null;

  return (
    <Panel title="Training" description="Cross-entropy + Adam, client-side TF.js">
      <div className="space-y-4">
        <Slider
          label="Epochs"
          min={1}
          max={100}
          step={1}
          value={config.epochs}
          disabled={isRunning}
          onValueChange={(epochs) => setModelConfig({ epochs })}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void start(canResume)}
            disabled={isRunning || !corpus}
          >
            {startLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={pause} disabled={!isRunning}>
            Pause
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={
              isRunning ||
              (training.status !== "trained" && training.status !== "paused") ||
              !getModel()
            }
            onClick={() => void save()}
          >
            Save
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span>
            Status:{" "}
            <span className="font-mono text-teal-300">{training.status}</span>
          </span>
          {(training.status === "training" || training.status === "paused") && (
            <span className="font-mono">
              epoch {training.currentEpoch}/{training.totalEpochs}
            </span>
          )}
          {batchPct !== null && training.status === "training" && (
            <span className="font-mono text-zinc-500">batch {batchPct}%</span>
          )}
          {training.backend && (
            <span className="font-mono text-zinc-500">backend: {training.backend}</span>
          )}
        </div>

        {training.status === "training" && training.batchProgress && (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={batchPct ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-teal-500/80 transition-[width] duration-150"
              style={{ width: `${batchPct ?? 0}%` }}
            />
          </div>
        )}

        {training.samplesCapped && training.sampleCount != null && (
          <p className="text-[11px] text-zinc-500">
            Using {training.sampleCount.toLocaleString()} of{" "}
            {training.totalPossibleSamples?.toLocaleString()} sequences (capped at{" "}
            {MAX_TRAIN_SAMPLES.toLocaleString()} to keep the tab responsive).
          </p>
        )}

        {training.backendWarning && (
          <p
            role="status"
            className="rounded-md border border-amber-700/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200"
          >
            {training.backendWarning}
          </p>
        )}

        {training.errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-rose-700/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
          >
            {training.errorMessage}
          </p>
        )}
      </div>
    </Panel>
  );
}
