import { describe, it, expect, vi } from "vitest";
import { markFieldLayerType } from "../src/layers/mark-field.js";

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

describe("particles:mark-field", () => {
  it("has correct typeId", () => {
    expect(markFieldLayerType.typeId).toBe("particles:mark-field");
  });

  it("has category draw", () => {
    expect(markFieldLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = markFieldLayerType.createDefault();
    expect(defaults.preset).toBe("grass-blades");
    expect(defaults.count).toBe(300);
    expect(defaults.markStyle).toBe("ink");
  });

  it("render executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...markFieldLayerType.createDefault(), count: 10 };
    expect(() => markFieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render calls fill for each mark", () => {
    const ctx = createMockCtx();
    const props = { ...markFieldLayerType.createDefault(), count: 20, seed: 1 };
    markFieldLayerType.render(props, ctx, BOUNDS, {} as any);
    expect((ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  it("validate passes for valid preset", () => {
    expect(markFieldLayerType.validate({ preset: "grass-blades" })).toBeNull();
  });

  it("validate passes for all 6 mark-field presets", () => {
    for (const id of ["grass-blades", "reed-field", "ink-scatter", "dry-brush", "charcoal-scatter", "calligraphy-marks"]) {
      expect(markFieldLayerType.validate({ preset: id })).toBeNull();
    }
  });

  it("validate fails for unknown preset", () => {
    const errors = markFieldLayerType.validate({ preset: "unknown-marks" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.property).toBe("preset");
  });

  it("properties include expected schema keys", () => {
    const keys = markFieldLayerType.properties.map((p) => p.key);
    expect(keys).toContain("count");
    expect(keys).toContain("markLength");
    expect(keys).toContain("markWidth");
    expect(keys).toContain("angle");
    expect(keys).toContain("angleVariation");
    expect(keys).toContain("curvature");
    expect(keys).toContain("markStyle");
    expect(keys).toContain("depthBandMin");
    expect(keys).toContain("depthLane");
    expect(keys).toContain("atmosphericMode");
  });

  it("createDefault has depthLane and atmosphericMode", () => {
    const defaults = markFieldLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("render with brush markStyle does not throw", () => {
    const ctx = createMockCtx();
    const props = {
      ...markFieldLayerType.createDefault(),
      preset: "dry-brush",
      count: 10,
      markStyle: "brush",
    };
    expect(() => markFieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render with pencil markStyle does not throw", () => {
    const ctx = createMockCtx();
    const props = {
      ...markFieldLayerType.createDefault(),
      count: 10,
      markStyle: "pencil",
    };
    expect(() => markFieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render with technical markStyle does not throw", () => {
    const ctx = createMockCtx();
    const props = {
      ...markFieldLayerType.createDefault(),
      count: 10,
      markStyle: "technical",
    };
    expect(() => markFieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render resets globalAlpha to 1 after drawing", () => {
    const ctx = createMockCtx();
    const props = { ...markFieldLayerType.createDefault(), count: 10 };
    markFieldLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.globalAlpha).toBe(1);
  });

  it("render with count:0 does not call fill", () => {
    const ctx = createMockCtx();
    const props = { ...markFieldLayerType.createDefault(), count: 0 };
    markFieldLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it("render with curvature:0 does not throw", () => {
    const ctx = createMockCtx();
    const props = { ...markFieldLayerType.createDefault(), count: 10, curvature: 0 };
    expect(() => markFieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render with angleVariation:180 does not throw", () => {
    const ctx = createMockCtx();
    const props = { ...markFieldLayerType.createDefault(), count: 10, angleVariation: 180 };
    expect(() => markFieldLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });
});
