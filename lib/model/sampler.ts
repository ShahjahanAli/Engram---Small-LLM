/**
 * Temperature-scaled categorical sampling over a probability vector.
 * temperature → 0 converges to argmax; high temperature flattens.
 */
export function sampleFromProbs(probs: ArrayLike<number>, temperature = 1): number {
  if (probs.length === 0) return 0;

  const t = Math.max(temperature, 1e-8);

  if (t < 1e-6) {
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > maxVal) {
        maxVal = probs[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  // Convert probs → logits-ish via log, scale by temperature, re-softmax
  const scaled: number[] = new Array(probs.length);
  let maxLog = -Infinity;
  for (let i = 0; i < probs.length; i++) {
    const logP = Math.log(Math.max(probs[i], 1e-12)) / t;
    scaled[i] = logP;
    if (logP > maxLog) maxLog = logP;
  }

  let sum = 0;
  for (let i = 0; i < scaled.length; i++) {
    scaled[i] = Math.exp(scaled[i] - maxLog);
    sum += scaled[i];
  }

  const r = Math.random() * sum;
  let cum = 0;
  for (let i = 0; i < scaled.length; i++) {
    cum += scaled[i];
    if (r <= cum) return i;
  }
  return scaled.length - 1;
}

export function topKProbs(
  probs: ArrayLike<number>,
  k: number,
  idxToChar: Record<number, string>
): { char: string; index: number; prob: number }[] {
  const indexed: { char: string; index: number; prob: number }[] = [];
  for (let i = 0; i < probs.length; i++) {
    indexed.push({
      char: idxToChar[i] ?? "?",
      index: i,
      prob: probs[i],
    });
  }
  indexed.sort((a, b) => b.prob - a.prob);
  return indexed.slice(0, k);
}
