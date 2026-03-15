import { describe, it, expect, vi } from "vitest";
import { trailingLayerType } from "../src/layers/trailing.js";

function createMockCtx() {
  const gradientMock = { addColorStop: vi.fn() };
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createRadialGradient: vi.fn(() => ({ ...gradientMock })),
    createLinearGradient: vi.fn(() => ({ ...gradientMock })),
    fillStyle: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

const BOUNDS = { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1 };

describe("particles:trailing", () => {
  it("has correct typeId", () => {
    expect(trailingLayerType.typeId).toBe("particles:trailing");
  });

  it("has category draw", () => {
    expect(trailingLayerType.category).toBe("draw");
  });

  it("createDefault returns valid properties", () => {
    const defaults = trailingLayerType.createDefault();
    expect(defaults.preset).toBe("meteor-shower");
    expect(defaults.count).toBe(80);
    expect(defaults.motionAngle).toBe(45);
  });

  it("render executes without error", () => {
    const ctx = createMockCtx();
    const props = { ...trailingLayerType.createDefault(), count: 5 };
    expect(() => trailingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });

  it("render draws streaks — fill called per particle", () => {
    const ctx = createMockCtx();
    const props = { ...trailingLayerType.createDefault(), count: 10, glow: false };
    trailingLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.fill).toHaveBeenCalledTimes(10);
  });

  it("render creates radial gradient for glow when glow:true", () => {
    const ctx = createMockCtx();
    const props = { ...trailingLayerType.createDefault(), count: 5, glow: true };
    trailingLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
  });

  it("render skips radial gradient when glow:false", () => {
    const ctx = createMockCtx();
    const props = { ...trailingLayerType.createDefault(), count: 5, glow: false };
    trailingLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });

  it("render uses linear gradient for streak taper", () => {
    const ctx = createMockCtx();
    const props = { ...trailingLayerType.createDefault(), count: 5, glow: false };
    trailingLayerType.render(props, ctx, BOUNDS, {} as any);
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(5);
  });

  it("render resets globalAlpha to 1 after drawing", () => {
    const ctx = createMockCtx();
    const props = { ...trailingLayerType.createDefault(), count: 5 };
    trailingLayerType.render(props, ctx, BOUNDS, {} as any);
    expect((ctx as any).globalAlpha).toBe(1);
  });

  it("validate passes for valid presets", () => {
    for (const id of ["meteor-shower", "speed-rain", "shooting-stars", "light-trails", "rising-sparks"]) {
      expect(trailingLayerType.validate({ preset: id })).toBeNull();
    }
  });

  it("validate fails for unknown preset", () => {
    const errors = trailingLayerType.validate({ preset: "unknown-preset" });
    expect(errors).toHaveLength(1);
    expect(errors![0]!.property).toBe("preset");
  });

  it("properties include expected schema keys", () => {
    const keys = trailingLayerType.properties.map((p) => p.key);
    expect(keys).toContain("trailLength");
    expect(keys).toContain("motionAngle");
    expect(keys).toContain("motionVariation");
    expect(keys).toContain("glow");
    expect(keys).toContain("glowColor");
    expect(keys).toContain("depthDistribution");
    expect(keys).toContain("depthLane");
    expect(keys).toContain("atmosphericMode");
  });

  it("createDefault has depthLane and atmosphericMode", () => {
    const defaults = trailingLayerType.createDefault();
    expect(defaults.depthLane).toBe("midground");
    expect(defaults.atmosphericMode).toBe("none");
  });

  it("rising-sparks preset renders upward streaks without error", () => {
    const ctx = createMockCtx();
    const props = {
      ...trailingLayerType.createDefault(),
      preset: "rising-sparks",
      motionAngle: 270,
      count: 5,
    };
    expect(() => trailingLayerType.render(props, ctx, BOUNDS, {} as any)).not.toThrow();
  });
});
