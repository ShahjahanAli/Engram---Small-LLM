import { create } from "zustand";
import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_TRAINING_STATE,
  type ActivationSnapshot,
  type GenerationConfig,
  type ModelConfig,
  type TrainingState,
} from "@/lib/types";

interface AppStore {
  corpus: string;
  modelConfig: ModelConfig;
  trainingState: TrainingState;
  generationConfig: GenerationConfig;
  generatedText: string;
  topProbs: { char: string; index: number; prob: number }[];
  activationSnapshot: ActivationSnapshot | null;
  isGenerating: boolean;
  paramCount: number;
  modelPersisted: boolean;
  generationError: string | null;

  setCorpus: (corpus: string) => void;
  setModelConfig: (partial: Partial<ModelConfig>) => void;
  setTrainingState: (partial: Partial<TrainingState>) => void;
  pushLoss: (epoch: number, loss: number) => void;
  resetTraining: () => void;
  setGenerationConfig: (partial: Partial<GenerationConfig>) => void;
  setGeneratedText: (text: string) => void;
  appendGeneratedText: (chunk: string) => void;
  setTopProbs: (probs: { char: string; index: number; prob: number }[]) => void;
  setActivationSnapshot: (snap: ActivationSnapshot | null) => void;
  setIsGenerating: (v: boolean) => void;
  setParamCount: (n: number) => void;
  setModelPersisted: (v: boolean) => void;
  setGenerationError: (msg: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  corpus: "",
  modelConfig: { ...DEFAULT_MODEL_CONFIG },
  trainingState: { ...DEFAULT_TRAINING_STATE },
  generationConfig: { ...DEFAULT_GENERATION_CONFIG },
  generatedText: "",
  topProbs: [],
  activationSnapshot: null,
  isGenerating: false,
  paramCount: 0,
  modelPersisted: false,
  generationError: null,

  setCorpus: (corpus) => set({ corpus }),
  setModelConfig: (partial) =>
    set((s) => ({ modelConfig: { ...s.modelConfig, ...partial } })),
  setTrainingState: (partial) =>
    set((s) => ({ trainingState: { ...s.trainingState, ...partial } })),
  pushLoss: (epoch, loss) =>
    set((s) => ({
      trainingState: {
        ...s.trainingState,
        currentEpoch: epoch,
        lossHistory: [...s.trainingState.lossHistory, { epoch, loss }],
      },
    })),
  resetTraining: () =>
    set((s) => ({
      trainingState: {
        ...DEFAULT_TRAINING_STATE,
        backend: s.trainingState.backend,
        backendWarning: s.trainingState.backendWarning,
      },
      generatedText: "",
      topProbs: [],
      activationSnapshot: null,
      paramCount: 0,
      modelPersisted: false,
      generationError: null,
    })),
  setGenerationConfig: (partial) =>
    set((s) => ({ generationConfig: { ...s.generationConfig, ...partial } })),
  setGeneratedText: (text) => set({ generatedText: text }),
  appendGeneratedText: (chunk) =>
    set((s) => ({ generatedText: s.generatedText + chunk })),
  setTopProbs: (probs) => set({ topProbs: probs }),
  setActivationSnapshot: (snap) => set({ activationSnapshot: snap }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setParamCount: (n) => set({ paramCount: n }),
  setModelPersisted: (v) => set({ modelPersisted: v }),
  setGenerationError: (msg) => set({ generationError: msg }),
}));
