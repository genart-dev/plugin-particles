import { describe, it, expect, vi } from "vitest";
import { floatingLayerType } from "../src/layers/floating.js";

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
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("particles:floating", () => {
  it("has correct typeId", () => {
    expect(floatingLayerType.typeId).toBe("particles:floating");
  });

  it("has category draw", () => {
    expect(floatingLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = floatingLayerType.createDefault();
    expect(defaults.preset).toBe("dust-motes");
    expect(defaults.count).toBe(100);
  });

  it("render executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...floatingLayerType.createDefault(), count: 10 };
    expect(() => floatingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("validate passes for valid preset", () => {
    expect(floatingLayerType.validate({ preset: "dust-motes" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = floatingLayerType.validate({ preset: "unknown" });
    expect(errors).toHaveLength(1);
  });

  it("properties include expected schemas", () => {
    const keys = floatingLayerType.properties.map((p) => p.key);
    expect(keys).toContain("glow");
    expect(keys).toContain("driftRange");
    expect(keys).toContain("depthBandMin");
  });
});
