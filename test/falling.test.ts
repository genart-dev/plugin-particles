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
