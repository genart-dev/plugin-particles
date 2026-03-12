import { describe, it, expect, vi } from "vitest";
import {
  drawCircle, drawSnowflake, drawRaindrop, drawLeaf, drawPetal, drawAsh, drawDust,
  drawEmber, drawNeedle,
  drawDot, drawWisp, drawFirefly, drawPollen, drawSparkle,
  drawButterfly, drawBubble, drawSeedTuft,
  drawStone, drawFlower, drawDebris, drawAcorn, drawShell,
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
    { name: "ember", fn: drawEmber },
    { name: "needle", fn: drawNeedle },
    { name: "dot", fn: drawDot },
    { name: "wisp", fn: drawWisp },
    { name: "firefly", fn: drawFirefly },
    { name: "pollen", fn: drawPollen },
    { name: "sparkle", fn: drawSparkle },
    { name: "butterfly", fn: drawButterfly },
    { name: "bubble", fn: drawBubble },
    { name: "seedTuft", fn: drawSeedTuft },
    { name: "stone", fn: drawStone },
    { name: "flower", fn: drawFlower },
    { name: "debris", fn: drawDebris },
    { name: "acorn", fn: drawAcorn },
    { name: "shell", fn: drawShell },
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
    expect(getFallingShape("ember")).toBe(drawEmber);
    expect(getFallingShape("needle")).toBe(drawNeedle);
  });

  it("getFallingShape returns circle for unknown type", () => {
    expect(getFallingShape("unknown")).toBe(drawCircle);
  });

  it("getFloatingShape returns correct shapes", () => {
    expect(getFloatingShape("firefly")).toBe(drawFirefly);
    expect(getFloatingShape("wisp")).toBe(drawWisp);
    expect(getFloatingShape("butterfly")).toBe(drawButterfly);
    expect(getFloatingShape("bubble")).toBe(drawBubble);
    expect(getFloatingShape("seed-tuft")).toBe(drawSeedTuft);
  });

  it("getFloatingShape returns dot for unknown type", () => {
    expect(getFloatingShape("unknown")).toBe(drawDot);
  });

  it("getScatterShape returns correct shapes", () => {
    expect(getScatterShape("stone")).toBe(drawStone);
    expect(getScatterShape("flower")).toBe(drawFlower);
    expect(getScatterShape("acorn")).toBe(drawAcorn);
    expect(getScatterShape("shell")).toBe(drawShell);
  });

  it("getScatterShape returns leaf for unknown type", () => {
    expect(getScatterShape("unknown")).toBe(drawLeaf);
  });
});
