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
  });
});
