import * as tf from "@tensorflow/tfjs";
import type { Vocab } from "@/lib/types";
import { buildProbeModels } from "./activationProbes";

let currentModel: tf.LayersModel | null = null;
let embedProbe: tf.LayersModel | null = null;
let rnnProbe: tf.LayersModel | null = null;
let vocab: Vocab | null = null;
let backendName: string | null = null;
let backendWarning: string | null = null;

export async function initTfBackend(): Promise<{ backend: string; warning?: string }> {
  if (backendName) {
    return { backend: backendName, warning: backendWarning ?? undefined };
  }

  try {
    await tf.setBackend("webgl");
    await tf.ready();
    if (tf.getBackend() === "webgl") {
      backendName = "webgl";
      backendWarning = null;
      return { backend: "webgl" };
    }
  } catch {
    // fall through to CPU
  }

  await tf.setBackend("cpu");
  await tf.ready();
  backendName = "cpu";
  backendWarning =
    "WebGL unavailable — falling back to CPU. Training will be slower.";
  return { backend: "cpu", warning: backendWarning };
}

export function getBackendInfo(): { backend: string | null; warning: string | null } {
  return { backend: backendName, warning: backendWarning };
}

function disposeProbes() {
  if (embedProbe) {
    embedProbe.dispose();
    embedProbe = null;
  }
  if (rnnProbe) {
    rnnProbe.dispose();
    rnnProbe = null;
  }
}

export function setModel(model: tf.LayersModel, v: Vocab) {
  disposeModel();
  currentModel = model;
  vocab = v;
  const probes = buildProbeModels(model);
  embedProbe = probes.embedProbe;
  rnnProbe = probes.rnnProbe;
}

export function getModel(): tf.LayersModel | null {
  return currentModel;
}

export function getVocab(): Vocab | null {
  return vocab;
}

export function getProbes(): {
  embedProbe: tf.LayersModel | null;
  rnnProbe: tf.LayersModel | null;
} {
  return { embedProbe, rnnProbe };
}

export function disposeModel() {
  disposeProbes();
  if (currentModel) {
    currentModel.dispose();
    currentModel = null;
  }
  vocab = null;
}

export function rebuildProbes() {
  if (!currentModel) return;
  disposeProbes();
  const probes = buildProbeModels(currentModel);
  embedProbe = probes.embedProbe;
  rnnProbe = probes.rnnProbe;
}
