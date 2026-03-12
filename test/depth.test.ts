import { describe, it, expect } from "vitest";
import {
  applyDepthEasing,
  computeDepth,
  applyDepthToParticle,
  sampleDepthDistribution,
} from "../src/shared/depth.js";
import {
  resolveDepthLane,
  depthForLane,
  laneSubLevelAttenuation,
  applyAtmosphericDepth,
  DEPTH_LANE_ORDER,
  DEPTH_LANE_OPTIONS,
} from "../src/shared/depth-lanes.js";

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

// ---------------------------------------------------------------------------
// Depth Lane tests
// ---------------------------------------------------------------------------

describe("resolveDepthLane", () => {
  it("resolves plain lane name with default sub-level 2", () => {
    const config = resolveDepthLane("midground");
    expect(config).not.toBeNull();
    expect(config!.lane).toBe("midground");
    expect(config!.subLevel).toBe(2);
  });

  it("resolves lane with sub-level suffix", () => {
    const config = resolveDepthLane("background-1");
    expect(config).not.toBeNull();
    expect(config!.lane).toBe("background");
    expect(config!.subLevel).toBe(1);
  });

  it("resolves far-background-3 correctly", () => {
    const config = resolveDepthLane("far-background-3");
    expect(config).not.toBeNull();
    expect(config!.lane).toBe("far-background");
    expect(config!.subLevel).toBe(3);
  });

  it("returns null for invalid input", () => {
    expect(resolveDepthLane("invalid")).toBeNull();
    expect(resolveDepthLane("")).toBeNull();
  });

  it("depth increases from sky to ground-plane", () => {
    const skyDepth = depthForLane("sky");
    const midDepth = depthForLane("midground");
    const groundDepth = depthForLane("ground-plane");
    expect(skyDepth).toBeLessThanOrEqual(midDepth);
    expect(midDepth).toBeLessThan(groundDepth);
  });
});

describe("laneSubLevelAttenuation", () => {
  it("sub-1 has smaller size scale", () => {
    const att = laneSubLevelAttenuation(1);
    expect(att.sizeScale).toBeLessThan(1);
    expect(att.opacity).toBeLessThan(1);
  });

  it("sub-2 has neutral values", () => {
    const att = laneSubLevelAttenuation(2);
    expect(att.sizeScale).toBe(1);
  });

  it("sub-3 has larger size scale", () => {
    const att = laneSubLevelAttenuation(3);
    expect(att.sizeScale).toBeGreaterThan(1);
    expect(att.opacity).toBe(1);
  });
});

describe("applyAtmosphericDepth", () => {
  it("returns unchanged color for mode none", () => {
    expect(applyAtmosphericDepth("#FF0000", 0.5, "none")).toBe("#FF0000");
  });

  it("western mode desaturates far colors", () => {
    const near = applyAtmosphericDepth("#FF0000", 1, "western");
    const far = applyAtmosphericDepth("#FF0000", 0, "western");
    // Far should be more muted (closer to grey/blue)
    expect(near).not.toBe(far);
  });

  it("ink-wash mode shifts toward paper tone", () => {
    const near = applyAtmosphericDepth("#FF0000", 1, "ink-wash");
    const far = applyAtmosphericDepth("#FF0000", 0, "ink-wash");
    expect(near).not.toBe(far);
  });

  it("depth 1 (nearest) returns near-original color", () => {
    const result = applyAtmosphericDepth("#FF0000", 1, "western");
    // At depth 1, effect is 0, so color should be very close to original
    expect(result.toLowerCase()).toBe("#ff0000");
  });
});

describe("DEPTH_LANE_ORDER", () => {
  it("has 7 lanes", () => {
    expect(DEPTH_LANE_ORDER).toHaveLength(7);
  });

  it("starts with sky and ends with overlay", () => {
    expect(DEPTH_LANE_ORDER[0]).toBe("sky");
    expect(DEPTH_LANE_ORDER[6]).toBe("overlay");
  });
});

describe("DEPTH_LANE_OPTIONS", () => {
  it("has options for all lanes and sub-levels", () => {
    // 7 plain lanes + 6 lanes with 3 sub-levels each (sky and overlay have no sub-levels listed, but they're included)
    expect(DEPTH_LANE_OPTIONS.length).toBeGreaterThan(7);
  });

  it("all options have value and label", () => {
    for (const opt of DEPTH_LANE_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });
});
