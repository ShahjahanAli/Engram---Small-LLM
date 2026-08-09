import { sampleFromProbs } from "../sampler";

describe("sampleFromProbs", () => {
  const peaked = [0.01, 0.02, 0.9, 0.05, 0.02];

  it("temperature near 0 converges to argmax", () => {
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 50; i++) {
      counts[sampleFromProbs(peaked, 1e-8)]++;
    }
    expect(counts[2]).toBe(50);
  });

  it("high temperature flattens (samples are more diverse)", () => {
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 400; i++) {
      counts[sampleFromProbs(peaked, 5)]++;
    }
    const unique = counts.filter((c) => c > 0).length;
    expect(unique).toBeGreaterThan(2);
    // Peak should be less dominant than at low temperature
    expect(counts[2] / 400).toBeLessThan(0.7);
  });
});
