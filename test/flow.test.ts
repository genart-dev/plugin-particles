import { describe, it, expect, vi } from "vitest";
import { flowLayerType } from "../src/layers/flow.js";

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("particles:flow", () => {
  it("has correct typeId", () => {
    expect(flowLayerType.typeId).toBe("particles:flow");
  });

  it("has category draw", () => {
    expect(flowLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = flowLayerType.createDefault();
    expect(defaults.preset).toBe("flow-smoke");
    expect(defaults.count).toBe(60);
    expect(defaults.pathSteps).toBe(80);
  });

  it("render executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...flowLayerType.createDefault(), count: 5, pathSteps: 10 };
    expect(() => flowLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render calls fill for each particle that produces a valid polygon", () => {
    const ctx = createMockCtx();
    const props = { ...flowLayerType.createDefault(), count: 10, pathSteps: 20, seed: 1 };
    flowLayerType.render(props, ctx, BOUNDS, {} as any);
    expect((ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  it("validate passes for valid preset", () => {
    expect(flowLayerType.validate({ preset: "flow-smoke" })).toBeNull();
  });

  it("validate passes for all 6 flow presets", () => {
    for (const id of ["flow-smoke", "ink-diffusion", "aurora", "lava-flow", "water-current", "wind-streams"]) {
      expect(flowLayerType.validate({ preset: id })).toBeNull();
    }
  });

  it("validate fails for unknown preset", () => {
    const errors = flowLayerType.validate({ preset: "unknown-flow" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.property).toBe("preset");
  });

  it("properties include expected schema keys", () => {
    const keys = flowLayerType.properties.map((p) => p.key);
    expect(keys).toContain("count");
    expect(keys).toContain("pathSteps");
    expect(keys).toContain("stepSize");
    expect(keys).toContain("noiseScale");
    expect(keys).toContain("noiseOctaves");
    expect(keys).toContain("swirling");
    expect(keys).toContain("depthLane");
    expect(keys).toContain("atmosphericMode");
  });

  it("createDefault has depthLane and atmosphericMode", () => {
    const defaults = flowLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("render with aurora preset does not throw", () => {
    const ctx = createMockCtx();
    const props = {
      ...flowLayerType.createDefault(),
      preset: "aurora",
      count: 5,
      pathSteps: 15,
      noiseOctaves: 2,
    };
    expect(() => flowLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render resets globalAlpha to 1 after drawing", () => {
    const ctx = createMockCtx();
    const props = { ...flowLayerType.createDefault(), count: 5, pathSteps: 10 };
    flowLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.globalAlpha).toBe(1);
  });

  it("render with count:0 does not call fill", () => {
    const ctx = createMockCtx();
    const props = { ...flowLayerType.createDefault(), count: 0 };
    flowLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
