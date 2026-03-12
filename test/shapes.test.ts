import { describe, it, expect, vi } from "vitest";
import {
  drawCircle, drawSnowflake, drawRaindrop, drawLeaf, drawPetal, drawAsh, drawDust,
  drawDot, drawWisp, drawFirefly, drawPollen, drawSparkle,
  drawStone, drawFlower, drawDebris, drawAcorn,
  getFallingShape, getFloatingShape, getScatterShape,
} from "../src/shared/shapes.js";
import { mulberry32 } from "../src/shared/prng.js";

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

describe("particle shapes", () => {
  const ctx = createMockCtx();
  const rng = mulberry32(42);

  const allShapes = [
    { name: "circle", fn: drawCircle },
    { name: "snowflake", fn: drawSnowflake },
    { name: "raindrop", fn: drawRaindrop },
    { name: "leaf", fn: drawLeaf },
    { name: "petal", fn: drawPetal },
    { name: "ash", fn: drawAsh },
    { name: "dust", fn: drawDust },
    { name: "dot", fn: drawDot },
    { name: "wisp", fn: drawWisp },
    { name: "firefly", fn: drawFirefly },
    { name: "pollen", fn: drawPollen },
    { name: "sparkle", fn: drawSparkle },
    { name: "stone", fn: drawStone },
    { name: "flower", fn: drawFlower },
    { name: "debris", fn: drawDebris },
    { name: "acorn", fn: drawAcorn },
  ];

  for (const { name, fn } of allShapes) {
    it(`${name} renders without error`, () => {
      expect(() => fn(ctx, 100, 100, 10, 0, "#FF0000", rng)).not.toThrow();
    });
  }
});

describe("shape lookup", () => {
  it("getFallingShape returns correct shapes", () => {
    expect(getFallingShape("snowflake")).toBe(drawSnowflake);
    expect(getFallingShape("raindrop")).toBe(drawRaindrop);
    expect(getFallingShape("leaf")).toBe(drawLeaf);
  });

  it("getFallingShape returns circle for unknown type", () => {
    expect(getFallingShape("unknown")).toBe(drawCircle);
  });

  it("getFloatingShape returns correct shapes", () => {
    expect(getFloatingShape("firefly")).toBe(drawFirefly);
    expect(getFloatingShape("wisp")).toBe(drawWisp);
  });

  it("getFloatingShape returns dot for unknown type", () => {
    expect(getFloatingShape("unknown")).toBe(drawDot);
  });

  it("getScatterShape returns correct shapes", () => {
    expect(getScatterShape("stone")).toBe(drawStone);
    expect(getScatterShape("flower")).toBe(drawFlower);
    expect(getScatterShape("acorn")).toBe(drawAcorn);
  });

  it("getScatterShape returns leaf for unknown type", () => {
    expect(getScatterShape("unknown")).toBe(drawLeaf);
  });
});
