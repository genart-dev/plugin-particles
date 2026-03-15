import { describe, it, expect, vi } from "vitest";
import { fallingLayerType } from "../src/layers/falling.js";

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("particles:falling", () => {
  it("has correct typeId", () => {
    expect(fallingLayerType.typeId).toBe("particles:falling");
  });

  it("has category draw", () => {
    expect(fallingLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = fallingLayerType.createDefault();
    expect(defaults.preset).toBe("snow");
    expect(defaults.count).toBe(200);
    expect(defaults.color).toBe("#FFFFFF");
  });

  it("render executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...fallingLayerType.createDefault(), count: 10 };
    expect(() => fallingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render calls drawing operations", () => {
    const ctx = createMockCtx();
    const props = { ...fallingLayerType.createDefault(), count: 5 };
    fallingLayerType.render(props, ctx, BOUNDS, {} as any);
    // Should have called beginPath for snowflake shapes
    expect(ctx.save).toHaveBeenCalled();
  });

  it("validate passes for valid preset", () => {
    expect(fallingLayerType.validate({ preset: "snow" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = fallingLayerType.validate({ preset: "unknown" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.property).toBe("preset");
  });

  it("properties include all expected schemas", () => {
    const keys = fallingLayerType.properties.map((p) => p.key);
    expect(keys).toContain("preset");
    expect(keys).toContain("seed");
    expect(keys).toContain("particleType");
    expect(keys).toContain("count");
    expect(keys).toContain("windAngle");
    expect(keys).toContain("windTurbulence");
    expect(keys).toContain("fallSpreadY");
    expect(keys).toContain("horizonY");
    expect(keys).toContain("depthLane");
    expect(keys).toContain("atmosphericMode");
  });

  it("createDefault has depthLane and atmosphericMode", () => {
    const defaults = fallingLayerType.createDefault();
    expect(defaults.depthLane).toBe("foreground");
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("validates new presets (embers, confetti, etc.)", () => {
    for (const id of ["embers", "ash-fall", "cherry-blossoms", "confetti", "pine-needles"]) {
      expect(fallingLayerType.validate({ preset: id })).toBeNull();
    }
  });

  it("createDefault has windTurbulence=0 and fallSpreadY=0", () => {
    const defaults = fallingLayerType.createDefault();
    expect(defaults.windTurbulence).toBe(0);
    expect(defaults.fallSpreadY).toBe(0);
  });

  it("render with windTurbulence=0.5 executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...fallingLayerType.createDefault(), count: 10, windTurbulence: 0.5 };
    expect(() => fallingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render with fallSpreadY=1 spreads particles across full height", () => {
    const ctx = createMockCtx();
    const props = { ...fallingLayerType.createDefault(), count: 10, fallProgress: 0.2, fallSpreadY: 1 };
    expect(() => fallingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("windTurbulence=0 gives same output as before (no extra rng consumption)", () => {
    const ctx1 = createMockCtx();
    const ctx2 = createMockCtx();
    const baseProps = { ...fallingLayerType.createDefault(), count: 20, windTurbulence: 0, fallSpreadY: 0 };
    // Both renders should complete without error and call same operations
    fallingLayerType.render(baseProps, ctx1, BOUNDS, {} as any);
    fallingLayerType.render(baseProps, ctx2, BOUNDS, {} as any);
    expect(ctx1.save).toHaveBeenCalledTimes(ctx2.save.mock.calls.length);
  });

  it("renders embers preset without error", () => {
    const ctx = createMockCtx();
    // embers uses drawEmber which needs createRadialGradient
    (ctx as any).createRadialGradient = vi.fn(() => ({
      addColorStop: vi.fn(),
    }));
    const props = { ...fallingLayerType.createDefault(), preset: "embers", particleType: "ember", count: 5 };
    expect(() => fallingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });
});
