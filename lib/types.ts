export interface ModelConfig {
  architecture: "gru" | "lstm";
  seqLen: number;
  embedDim: number;
  hiddenUnits: number;
  epochs: number;
  learningRate: number;
  batchSize: number;
}

export interface TrainingState {
  status: "idle" | "preparing" | "training" | "trained" | "error" | "paused";
  currentEpoch: number;
  totalEpochs: number;
  lossHistory: { epoch: number; loss: number }[];
  vocabSize: number;
  errorMessage?: string;
  backend?: string;
  backendWarning?: string;
  /** Samples used this run (may be capped) */
  sampleCount?: number;
  totalPossibleSamples?: number;
  samplesCapped?: boolean;
  batchProgress?: { batch: number; total: number };
}

export interface GenerationConfig {
  prompt: string;
  length: number;
  temperature: number;
}

export interface ActivationSnapshot {
  inputChars: string[];
  embedVector: number[];
  hiddenVector: number[];
  outputProbs: number[];
  sampledIndex: number;
}

export interface Vocab {
  charToIdx: Record<string, number>;
  idxToChar: Record<number, string>;
  size: number;
}

export interface TopProb {
  char: string;
  index: number;
  prob: number;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  architecture: "gru",
  seqLen: 40,
  embedDim: 32,
  hiddenUnits: 64,
  epochs: 20,
  learningRate: 0.01,
  batchSize: 64,
};

export const DEFAULT_TRAINING_STATE: TrainingState = {
  status: "idle",
  currentEpoch: 0,
  totalEpochs: 0,
  lossHistory: [],
  vocabSize: 0,
};

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  prompt: "",
  length: 200,
  temperature: 0.8,
};
