import * as tf from "@tensorflow/tfjs";
import { encode, decode } from "@/lib/model/tokenizer";
import { sampleFromProbs, topKProbs } from "@/lib/model/sampler";
import { getActivations } from "@/lib/model/activationProbes";
import {
  getModel,
  getVocab,
  getProbes,
} from "@/lib/model/modelRegistry";
import type { ActivationSnapshot, GenerationConfig } from "@/lib/types";

export interface GenerateCallbacks {
  onToken?: (char: string, topProbs: ReturnType<typeof topKProbs>, snap: ActivationSnapshot | null) => void;
  shouldStop?: () => boolean;
  probeEvery?: number;
}

export async function generateText(
  config: GenerationConfig,
  seqLen: number,
  callbacks: GenerateCallbacks = {}
): Promise<string> {
  const model = getModel();
  const vocab = getVocab();
  const { embedProbe, rnnProbe } = getProbes();

  if (!model || !vocab) {
    throw new Error("Train a model before generating.");
  }

  let text = config.prompt || Object.values(vocab.idxToChar)[0] || " ";
  const probeEvery = callbacks.probeEvery ?? 4;

  for (let i = 0; i < config.length; i++) {
    if (callbacks.shouldStop?.()) break;

    const ids = encode(text, vocab);
    const padded = new Array(seqLen).fill(0);
    const start = Math.max(0, ids.length - seqLen);
    const slice = ids.slice(start);
    for (let j = 0; j < slice.length; j++) {
      padded[seqLen - slice.length + j] = slice[j];
    }

    const xs = tf.tensor2d([padded], [1, seqLen], "int32");
    const pred = model.predict(xs) as tf.Tensor;
    const probs = await pred.data();
    pred.dispose();
    xs.dispose();

    const nextIdx = sampleFromProbs(probs, config.temperature);
    const nextChar = vocab.idxToChar[nextIdx] ?? "";
    text += nextChar;

    const tops = topKProbs(probs, 8, vocab.idxToChar);

    let snap: ActivationSnapshot | null = null;
    if (embedProbe && rnnProbe && (i % probeEvery === 0 || i === config.length - 1)) {
      const acts = await getActivations(model, embedProbe, rnnProbe, encode(text, vocab), seqLen);
      const inputChars = text.slice(-Math.min(seqLen, text.length)).split("");
      snap = {
        inputChars,
        embedVector: acts.embedVector,
        hiddenVector: acts.hiddenVector,
        outputProbs: acts.outputProbs,
        sampledIndex: nextIdx,
      };
    }

    callbacks.onToken?.(nextChar, tops, snap);

    // Yield to UI
    await new Promise((r) => setTimeout(r, 0));
  }

  return text;
}

export function decodeIds(ids: number[]): string {
  const vocab = getVocab();
  if (!vocab) return "";
  return decode(ids, vocab);
}
