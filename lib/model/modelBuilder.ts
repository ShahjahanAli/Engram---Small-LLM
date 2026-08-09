import * as tf from "@tensorflow/tfjs";
import type { ModelConfig } from "@/lib/types";

export function buildModel(config: ModelConfig, vocabSize: number): tf.LayersModel {
  const model = tf.sequential();

  model.add(
    tf.layers.embedding({
      inputDim: vocabSize,
      outputDim: config.embedDim,
      inputLength: config.seqLen,
      name: "embedding",
    })
  );

  if (config.architecture === "lstm") {
    model.add(
      tf.layers.lstm({
        units: config.hiddenUnits,
        name: "rnn",
      })
    );
  } else {
    model.add(
      tf.layers.gru({
        units: config.hiddenUnits,
        name: "rnn",
      })
    );
  }

  model.add(
    tf.layers.dense({
      units: vocabSize,
      activation: "softmax",
      name: "output",
    })
  );

  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    // Sparse labels avoid a huge one-hot tensor that freezes the tab
    loss: "sparseCategoricalCrossentropy",
  });
  return model;
}

export function countParams(model: tf.LayersModel): number {
  return model.countParams();
}
