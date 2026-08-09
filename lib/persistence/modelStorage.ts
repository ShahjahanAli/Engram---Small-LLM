import * as tf from "@tensorflow/tfjs";
import { get, set, del, keys } from "idb-keyval";
import type { ModelConfig, Vocab } from "@/lib/types";
import { setModel, getModel, getVocab } from "@/lib/model/modelRegistry";

const MODEL_META_KEY = "engram:model-meta";
const CORPUS_KEY = "engram:corpus";
const TF_MODEL_PATH = "indexeddb://engram-model";

export interface SavedModelMeta {
  config: ModelConfig;
  vocab: Vocab;
  savedAt: number;
  paramCount: number;
}

export async function saveCorpus(corpus: string): Promise<void> {
  await set(CORPUS_KEY, corpus);
}

export async function loadCorpus(): Promise<string | undefined> {
  return get<string>(CORPUS_KEY);
}

export async function saveTrainedModel(
  config: ModelConfig,
  vocab: Vocab,
  paramCount: number
): Promise<void> {
  const model = getModel();
  if (!model) throw new Error("No model to save");

  await model.save(TF_MODEL_PATH);
  const meta: SavedModelMeta = {
    config,
    vocab,
    savedAt: Date.now(),
    paramCount,
  };
  await set(MODEL_META_KEY, meta);
}

export async function loadTrainedModel(): Promise<SavedModelMeta | null> {
  const meta = await get<SavedModelMeta>(MODEL_META_KEY);
  if (!meta) return null;

  try {
    const model = await tf.loadLayersModel(TF_MODEL_PATH);
    model.compile({
      optimizer: tf.train.adam(meta.config.learningRate),
      loss: "sparseCategoricalCrossentropy",
    });
    setModel(model, meta.vocab);
    return meta;
  } catch {
    return null;
  }
}

export async function clearSavedModel(): Promise<void> {
  try {
    await tf.io.removeModel(TF_MODEL_PATH);
  } catch {
    // ignore if missing
  }
  await del(MODEL_META_KEY);
}

export async function hasSavedModel(): Promise<boolean> {
  const meta = await get<SavedModelMeta>(MODEL_META_KEY);
  return Boolean(meta);
}

export async function listIdbKeys(): Promise<IDBValidKey[]> {
  return keys();
}

export { getVocab };
