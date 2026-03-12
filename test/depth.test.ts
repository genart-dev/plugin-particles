import { describe, it, expect } from "vitest";
import {
  applyDepthEasing,
  computeDepth,
  applyDepthToParticle,
  sampleDepthDistribution,
} from "../src/shared/depth.js";

describe("applyDepthEasing", () => {
  it("linear returns input unchanged", () => {
    expect(applyDepthEasing(0.5, "linear")).toBe(0.5);
    expect(applyDepthEasing(0, "linear")).toBe(0);
    expect(applyDepthEasing(1, "linear")).toBe(1);
  });

  it("quadratic squares the input", () => {
    expect(applyDepthEasing(0.5, "quadratic")).toBe(0.25);
    expect(applyDepthEasing(1, "quadratic")).toBe(1);
    expect(applyDepthEasing(0, "quadratic")).toBe(0);
  });

  it("cubic cubes the input", () => {
    expect(applyDepthEasing(0.5, "cubic")).toBeCloseTo(0.125);
  });

  it("exponential maps 0 to 0 and 1 to 1", () => {
    expect(applyDepthEasing(0, "exponential")).toBeCloseTo(0, 5);
    expect(applyDepthEasing(1, "exponential")).toBeCloseTo(1, 5);
  });
});

describe("computeDepth", () => {
  const config = { horizonY: 0.3, easing: "linear" as const, distribution: "uniform" as const };

  it("returns 0 above horizon", () => {
    expect(computeDepth(0, config)).toBe(0);
    expect(computeDepth(0.2, config)).toBe(0);
    expect(computeDepth(0.3, config)).toBe(0);
  });

  it("returns 1 at bottom", () => {
    expect(computeDepth(1, config)).toBeCloseTo(1);
  });

  it("returns intermediate values below horizon", () => {
    const depth = computeDepth(0.65, config);
    expect(depth).toBeGreaterThan(0);
    expect(depth).toBeLessThan(1);
  });
});

describe("applyDepthToParticle", () => {
  it("at depth 0 returns min size and low opacity", () => {
    const { size, opacity } = applyDepthToParticle(0, 2, 10, 1);
    expect(size).toBe(2);
    expect(opacity).toBeCloseTo(0.3);
  });

  it("at depth 1 returns max size and full opacity", () => {
    const { size, opacity } = applyDepthToParticle(1, 2, 10, 1);
    expect(size).toBe(10);
    expect(opacity).toBeCloseTo(1);
  });

  it("respects base opacity", () => {
    const { opacity } = applyDepthToParticle(1, 2, 10, 0.5);
    expect(opacity).toBeCloseTo(0.5);
  });
});

describe("sampleDepthDistribution", () => {
  it("returns values in [0, 1]", () => {
    let i = 0;
    const rng = () => (i++ % 10) / 10;

    for (const dist of ["uniform", "foreground-heavy", "background-heavy", "midground"] as const) {
      for (let j = 0; j < 20; j++) {
        const v = sampleDepthDistribution(rng, dist);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
