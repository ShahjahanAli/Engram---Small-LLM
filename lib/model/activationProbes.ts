import * as tf from "@tensorflow/tfjs";

export function buildProbeModels(model: tf.LayersModel): {
  embedProbe: tf.LayersModel;
  rnnProbe: tf.LayersModel;
} {
  const embedProbe = tf.model({
    inputs: model.inputs,
    outputs: model.layers[0].output as tf.SymbolicTensor,
  });

  const rnnProbe = tf.model({
    inputs: model.inputs,
    outputs: model.layers[1].output as tf.SymbolicTensor,
  });

  return { embedProbe, rnnProbe };
}

export async function getActivations(
  model: tf.LayersModel,
  embedProbe: tf.LayersModel,
  rnnProbe: tf.LayersModel,
  inputIds: number[],
  seqLen: number
): Promise<{
  embedVector: number[];
  hiddenVector: number[];
  outputProbs: number[];
}> {
  // Pad / trim to seqLen from the right (most recent context)
  const padded = new Array(seqLen).fill(0);
  const start = Math.max(0, inputIds.length - seqLen);
  const slice = inputIds.slice(start);
  for (let i = 0; i < slice.length; i++) {
    padded[seqLen - slice.length + i] = slice[i];
  }

  const xs = tf.tensor2d([padded], [1, seqLen], "int32");

  try {
    const embedOut = embedProbe.predict(xs) as tf.Tensor;
    const rnnOut = rnnProbe.predict(xs) as tf.Tensor;
    const out = model.predict(xs) as tf.Tensor;

    const [embedData, rnnData, outData] = await Promise.all([
      embedOut.data(),
      rnnOut.data(),
      out.data(),
    ]);

    // Embedding is [1, seqLen, embedDim] — take last timestep mean or last step
    const embedArr = Array.from(embedData);
    const embedDim = embedArr.length / seqLen;
    const lastEmbed = embedArr.slice(embedArr.length - embedDim);

    embedOut.dispose();
    rnnOut.dispose();
    out.dispose();

    return {
      embedVector: lastEmbed,
      hiddenVector: Array.from(rnnData),
      outputProbs: Array.from(outData),
    };
  } finally {
    xs.dispose();
  }
}
