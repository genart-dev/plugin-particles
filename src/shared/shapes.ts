/**
 * Particle shape renderers — pure canvas2d path functions.
 * All renderers: (ctx, x, y, size, rotation, color, rng) => void
 */

type ShapeRenderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  rng: () => number,
) => void;

// ---------------------------------------------------------------------------
// Falling particle shapes
// ---------------------------------------------------------------------------

export const drawCircle: ShapeRenderer = (ctx, x, y, size, _rot, color) => {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

export const drawSnowflake: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const r = size * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.5, size * 0.1);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(0, 0);
    const ex = Math.cos(angle) * r;
    const ey = Math.sin(angle) * r;
    ctx.lineTo(ex, ey);
    // Small branch near tip
    const bx = ex * 0.6;
    const by = ey * 0.6;
    const branchLen = r * 0.3;
    const ba1 = angle + Math.PI / 6;
    const ba2 = angle - Math.PI / 6;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ba1) * branchLen, by + Math.sin(ba1) * branchLen);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ba2) * branchLen, by + Math.sin(ba2) * branchLen);
  }
  ctx.stroke();
  ctx.restore();
};

export const drawRaindrop: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const w = size * 0.3;
  const h = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawLeaf: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const r = size * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.8, -r * 0.3, r * 0.6, r * 0.5, 0, r);
  ctx.bezierCurveTo(-r * 0.6, r * 0.5, -r * 0.8, -r * 0.3, 0, -r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawPetal: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const r = size * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.5, -r * 0.6, r * 0.4, r * 0.2, 0, r * 0.8);
  ctx.bezierCurveTo(-r * 0.4, r * 0.2, -r * 0.5, -r * 0.6, 0, -r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawAsh: ShapeRenderer = (ctx, x, y, size, rotation, color, rng) => {
  const r = size * 0.4;
  const points = 5 + Math.floor(rng() * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const dist = r * (0.7 + rng() * 0.3);
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawDust: ShapeRenderer = (ctx, x, y, size, _rot, color) => {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, size * 0.3), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

// ---------------------------------------------------------------------------
// Floating particle shapes
// ---------------------------------------------------------------------------

export const drawDot: ShapeRenderer = (ctx, x, y, size, _rot, color) => {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

export const drawWisp: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const len = size * 1.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, 0);
  ctx.bezierCurveTo(-len * 0.2, -size * 0.3, len * 0.2, size * 0.3, len * 0.5, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.3, size * 0.15);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
};

export const drawFirefly: ShapeRenderer = (ctx, x, y, size, _rot, color) => {
  const r = size * 0.5;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  // Bright center
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
};

export const drawPollen: ShapeRenderer = (ctx, x, y, size, _rot, color) => {
  const r = size * 0.35;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.3, size * 0.08);
  ctx.stroke();
};

export const drawSparkle: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const r = size * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const innerAngle = angle + Math.PI / 4;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    ctx.lineTo(Math.cos(innerAngle) * r * 0.25, Math.sin(innerAngle) * r * 0.25);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

// ---------------------------------------------------------------------------
// Scatter element shapes
// ---------------------------------------------------------------------------

export const drawStone: ShapeRenderer = (ctx, x, y, size, rotation, color, rng) => {
  const r = size * 0.4;
  const points = 7;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const dist = r * (0.8 + rng() * 0.2);
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist * 0.7; // flattened
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawFlower: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const r = size * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  // 5 petals
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const px = Math.cos(angle) * r * 0.5;
    const py = Math.sin(angle) * r * 0.5;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.4, r * 0.25, angle, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  // Center
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD700";
  ctx.fill();
  ctx.restore();
};

export const drawDebris: ShapeRenderer = (ctx, x, y, size, rotation, color, rng) => {
  const r = size * 0.4;
  const points = 4 + Math.floor(rng() * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 + rng() * 0.3;
    const dist = r * (0.6 + rng() * 0.4);
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawAcorn: ShapeRenderer = (ctx, x, y, size, rotation, color) => {
  const r = size * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  // Cap
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.3, r * 0.5, r * 0.25, 0, Math.PI, 0);
  ctx.fillStyle = "#8B6914";
  ctx.fill();
  // Body
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

// ---------------------------------------------------------------------------
// Shape lookup
// ---------------------------------------------------------------------------

const FALLING_SHAPES: Record<string, ShapeRenderer> = {
  circle: drawCircle,
  snowflake: drawSnowflake,
  raindrop: drawRaindrop,
  leaf: drawLeaf,
  petal: drawPetal,
  ash: drawAsh,
  dust: drawDust,
};

const FLOATING_SHAPES: Record<string, ShapeRenderer> = {
  dot: drawDot,
  wisp: drawWisp,
  firefly: drawFirefly,
  pollen: drawPollen,
  sparkle: drawSparkle,
};

const SCATTER_SHAPES: Record<string, ShapeRenderer> = {
  leaf: drawLeaf,
  stone: drawStone,
  flower: drawFlower,
  debris: drawDebris,
  petal: drawPetal,
  acorn: drawAcorn,
};

export function getFallingShape(type: string): ShapeRenderer {
  return FALLING_SHAPES[type] ?? drawCircle;
}

export function getFloatingShape(type: string): ShapeRenderer {
  return FLOATING_SHAPES[type] ?? drawDot;
}

export function getScatterShape(type: string): ShapeRenderer {
  return SCATTER_SHAPES[type] ?? drawLeaf;
}
