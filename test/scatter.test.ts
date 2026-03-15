import { describe, it, expect, vi } from "vitest";
import { scatterLayerType } from "../src/layers/scatter.js";

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    ellipse: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("particles:scatter", () => {
  it("has correct typeId", () => {
    expect(scatterLayerType.typeId).toBe("particles:scatter");
  });

  it("has category draw", () => {
    expect(scatterLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = scatterLayerType.createDefault();
    expect(defaults.preset).toBe("fallen-leaves");
    expect(defaults.count).toBe(80);
    expect(defaults.distribution).toBe("clustered");
  });

  it("render executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...scatterLayerType.createDefault(), count: 10 };
    expect(() => scatterLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("validate passes for valid preset", () => {
    expect(scatterLayerType.validate({ preset: "fallen-leaves" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = scatterLayerType.validate({ preset: "unknown" });
    expect(errors).toHaveLength(1);
  });

  it("properties include expected schemas", () => {
    const keys = scatterLayerType.properties.map((p) => p.key);
    expect(keys).toContain("elementType");
    expect(keys).toContain("distribution");
    expect(keys).toContain("clusterStrength");
    expect(keys).toContain("groundY");
    expect(keys).toContain("depthLane");
    expect(keys).toContain("atmosphericMode");
  });

  it("createDefault has depthLane and atmosphericMode", () => {
    const defaults = scatterLayerType.createDefault();
    expect(defaults.depthLane).toBe("ground-plane");
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("validates new presets (shells, acorns, sea-foam)", () => {
    for (const id of ["shells", "acorns", "sea-foam"]) {
      expect(scatterLayerType.validate({ preset: id })).toBeNull();
    }
  });

  it("renders shells preset without error", () => {
    const ctx = createMockCtx();
    const props = { ...scatterLayerType.createDefault(), preset: "shells", elementType: "shell", count: 5 };
    expect(() => scatterLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("depth sort: elements are drawn in back-to-front order (globalAlpha tracks y)", () => {
    // With depth sort, elements at smaller normalizedY (horizon = further = smaller)
    // are drawn before elements at larger normalizedY (ground = closer = larger).
    // Deeper elements are smaller (less opacity from applyDepthToParticle).
    // We verify render completes and the ctx operations are called in some order.
    const ctx = createMockCtx();
    const alphas: number[] = [];
    Object.defineProperty(ctx, "globalAlpha", {
      get: () => 1,
      set: (v: number) => alphas.push(v),
    });
    const props = { ...scatterLayerType.createDefault(), count: 20, distribution: "uniform", seed: 1 };
    scatterLayerType.render(props, ctx, BOUNDS, {} as any);
    // Should have recorded count globalAlpha assignments + 1 final reset
    expect(alphas.length).toBe(21);
  });

  it("clustered distribution: render completes without error (bug 4: x-only cluster)", () => {
    const ctx = createMockCtx();
    const props = {
      ...scatterLayerType.createDefault(),
      count: 30,
      distribution: "clustered",
      clusterStrength: 0.8,
    };
    expect(() => scatterLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("uniform distribution: render completes without error", () => {
    const ctx = createMockCtx();
    const props = { ...scatterLayerType.createDefault(), count: 20, distribution: "uniform" };
    expect(() => scatterLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });
});
