import { describe, it, expect, vi } from "vitest";
import { mistLayerType } from "../src/layers/mist.js";

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("particles:mist", () => {
  it("has correct typeId", () => {
    expect(mistLayerType.typeId).toBe("particles:mist");
  });

  it("has category draw", () => {
    expect(mistLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = mistLayerType.createDefault();
    expect(defaults.preset).toBe("morning-mist");
    expect(defaults.density).toBe(0.4);
    expect(defaults.layerCount).toBe(3);
  });

  it("render executes without error (Node-compatible, no OffscreenCanvas needed)", () => {
    const ctx = createMockCtx();
    const props = { ...mistLayerType.createDefault(), layerCount: 1 };
    expect(() => mistLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render uses createImageData and putImageData — no OffscreenCanvas dependency", () => {
    const ctx = createMockCtx();
    const props = { ...mistLayerType.createDefault(), layerCount: 1 };
    mistLayerType.render(props, ctx, BOUNDS, {} as any);
    // Two createImageData calls: one for the 1/4-res buffer, one for the full-size upscale
    expect(ctx.createImageData).toHaveBeenCalledTimes(2);
    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("validate passes for valid preset", () => {
    expect(mistLayerType.validate({ preset: "morning-mist" })).toBeNull();
  });

  it("validate fails for unknown preset", () => {
    const errors = mistLayerType.validate({ preset: "unknown" });
    expect(errors).toHaveLength(1);
  });

  it("properties include expected schemas", () => {
    const keys = mistLayerType.properties.map((p) => p.key);
    expect(keys).toContain("density");
    expect(keys).toContain("bandTop");
    expect(keys).toContain("bandBottom");
    expect(keys).toContain("edgeSoftness");
    expect(keys).toContain("noiseScale");
    expect(keys).toContain("layerCount");
    expect(keys).toContain("depthLane");
    expect(keys).toContain("atmosphericMode");
  });

  it("createDefault has depthLane and atmosphericMode", () => {
    const defaults = mistLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("validates new presets (ground-steam-thick, smoke-wisps)", () => {
    for (const id of ["ground-steam-thick", "smoke-wisps"]) {
      expect(mistLayerType.validate({ preset: id })).toBeNull();
    }
  });
});
