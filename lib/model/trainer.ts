import * as tf from "@tensorflow/tfjs";
import type { ModelConfig, Vocab } from "@/lib/types";
import { encode } from "./tokenizer";

/** Cap browser training set so one epoch can't lock the main thread for minutes. */
export const MAX_TRAIN_SAMPLES = 2048;

/** Yield to the browser event loop / paint. */
export async function yieldToUi(): Promise<void> {
  await tf.nextFrame();
  // Extra macrotask so React state updates and click handlers can run
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function pickSampleStarts(totalPossible: number, maxSamples: number): number[] {
  if (totalPossible <= maxSamples) {
    return Array.from({ length: totalPossible }, (_, i) => i);
  }

  // Even stride across the corpus (deterministic, covers beginning→end)
  const starts: number[] = [];
  for (let i = 0; i < maxSamples; i++) {
    starts.push(Math.floor((i * (totalPossible - 1)) / (maxSamples - 1)));
  }
  return starts;
}

export async function prepareSequences(
  text: string,
  vocab: Vocab,
  seqLen: number,
  maxSamples = MAX_TRAIN_SAMPLES
): Promise<{
  xs: tf.Tensor2D;
  ys: tf.Tensor1D;
  sampleCount: number;
  totalPossible: number;
  capped: boolean;
}> {
  if (text.length < seqLen + 1) {
    throw new Error(
      `Corpus too short: need at least ${seqLen + 1} characters (have ${text.length}).`
    );
  }

  await yieldToUi();

  const ids = encode(text, vocab);
  if (ids.length < seqLen + 1) {
    throw new Error(
      `Encoded corpus too short after tokenization: need ${seqLen + 1} tokens (have ${ids.length}).`
    );
  }

  const totalPossible = ids.length - seqLen;
  const starts = pickSampleStarts(totalPossible, maxSamples);
  const sampleCount = starts.length;
  const capped = sampleCount < totalPossible;

  // Flat typed buffers — much cheaper than number[][] + one-hot
  const xsData = new Int32Array(sampleCount * seqLen);
  const ysData = new Int32Array(sampleCount);

  for (let s = 0; s < sampleCount; s++) {
    const start = starts[s];
    const row = s * seqLen;
    for (let j = 0; j < seqLen; j++) {
      xsData[row + j] = ids[start + j];
    }
    ysData[s] = ids[start + seqLen];

    // Keep the tab responsive while packing large sets
    if (s > 0 && s % 512 === 0) {
      await yieldToUi();
    }
  }

  const xs = tf.tensor2d(xsData, [sampleCount, seqLen], "int32");
  // TF.js sparseCategoricalCrossentropy uses floor() on labels and requires float32
  const ys = tf.tensor1d(Array.from(ysData), "float32");

  return { xs, ys, sampleCount, totalPossible, capped };
}

export interface TrainCallbacks {
  onEpochEnd?: (epoch: number, loss: number) => void;
  onBatchEnd?: (batch: number, totalBatches: number) => void;
  onPrepared?: (info: {
    sampleCount: number;
    totalPossible: number;
    capped: boolean;
  }) => void;
  onTrainBegin?: () => void;
  onTrainEnd?: () => void;
  shouldStop?: () => boolean;
}

export async function trainModel(
  model: tf.LayersModel,
  text: string,
  vocab: Vocab,
  config: ModelConfig,
  callbacks: TrainCallbacks = {}
): Promise<void> {
  const { xs, ys, sampleCount, totalPossible, capped } = await prepareSequences(
    text,
    vocab,
    config.seqLen
  );

  callbacks.onPrepared?.({ sampleCount, totalPossible, capped });
  await yieldToUi();

  const totalBatches = Math.max(1, Math.ceil(sampleCount / config.batchSize));
  let batchCounter = 0;

  try {
    callbacks.onTrainBegin?.();

    await model.fit(xs, ys, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      shuffle: true,
      // Yield after every batch so the UI / Pause button stay usable
      yieldEvery: "batch",
      callbacks: {
        onBatchEnd: async (batch) => {
          batchCounter = batch + 1;
          if (batchCounter % 2 === 0 || batchCounter >= totalBatches) {
            callbacks.onBatchEnd?.(batchCounter, totalBatches);
            await yieldToUi();
          }
          if (callbacks.shouldStop?.()) {
            model.stopTraining = true;
          }
        },
        onEpochEnd: async (epoch, logs) => {
          const loss = logs?.loss ?? NaN;
          if (Number.isNaN(loss)) {
            throw new Error(
              "Training produced NaN loss — try lowering learning rate or checking corpus."
            );
          }
          callbacks.onEpochEnd?.(epoch + 1, loss);
          await yieldToUi();
          if (callbacks.shouldStop?.()) {
            model.stopTraining = true;
          }
        },
      },
    });

    callbacks.onTrainEnd?.();
  } finally {
    xs.dispose();
    ys.dispose();
  }
}
