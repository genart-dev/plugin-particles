import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex } from "../shared/color-utils.js";
import { varyColor } from "../shared/color-utils.js";
import { applyDepthToParticle, sampleDepthDistribution } from "../shared/depth.js";
import type { DepthEasing, DepthDistribution } from "../shared/depth.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  laneSubLevelAttenuation,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { TrailingPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const TRAILING_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "meteor-shower",
    group: "preset",
    options: [
      { value: "meteor-shower", label: "Meteor Shower" },
      { value: "speed-rain", label: "Speed Rain" },
      { value: "shooting-stars", label: "Shooting Stars" },
      { value: "light-trails", label: "Light Trails" },
      { value: "rising-sparks", label: "Rising Sparks" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "count", label: "Count", type: "number", default: 80, min: 5, max: 2000, step: 5, group: "density" },
  { key: "sizeMin", label: "Size Min", type: "number", default: 1, min: 0.5, max: 20, step: 0.5, group: "size" },
  { key: "sizeMax", label: "Size Max", type: "number", default: 3, min: 0.5, max: 20, step: 0.5, group: "size" },
  { key: "trailLength", label: "Trail Length", type: "number", default: 0.15, min: 0.02, max: 0.6, step: 0.01, group: "shape" },
  { key: "motionAngle", label: "Motion Angle", type: "number", default: 45, min: 0, max: 360, step: 5, group: "motion" },
  { key: "motionVariation", label: "Motion Variation", type: "number", default: 12, min: 0, max: 60, step: 1, group: "motion" },
  { key: "color", label: "Color", type: "color", default: "#C8D8FF", group: "style" },
  { key: "colorVariation", label: "Color Variation", type: "number", default: 0.1, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.85, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "glow", label: "Glow", type: "boolean", default: true, group: "style" },
  { key: "glowColor", label: "Glow Color", type: "color", default: "#FFFFFF", group: "style" },
  {
    key: "depthDistribution",
    label: "Depth Distribution",
    type: "select",
    default: "uniform",
    group: "depth",
    options: [
      { value: "uniform", label: "Uniform" },
      { value: "foreground-heavy", label: "Foreground Heavy" },
      { value: "background-heavy", label: "Background Heavy" },
      { value: "midground", label: "Midground" },
    ],
  },
  {
    key: "depthEasing",
    label: "Depth Easing",
    type: "select",
    default: "linear",
    group: "depth",
    options: [
      { value: "linear", label: "Linear" },
      { value: "quadratic", label: "Quadratic" },
      { value: "cubic", label: "Cubic" },
      { value: "exponential", label: "Exponential" },
    ],
  },
  { key: "horizonY", label: "Horizon Y", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "depth" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  count: number;
  sizeMin: number;
  sizeMax: number;
  trailLength: number;
  motionAngle: number;
  motionVariation: number;
  color: string;
  colorVariation: number;
  opacity: number;
  glow: boolean;
  glowColor: string;
  depthDistribution: DepthDistribution;
  depthEasing: DepthEasing;
  horizonY: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const tp = preset?.category === "trailing" ? (preset as TrailingPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    count: (properties.count as number) ?? tp?.count ?? 80,
    sizeMin: (properties.sizeMin as number) ?? tp?.sizeMin ?? 1,
    sizeMax: (properties.sizeMax as number) ?? tp?.sizeMax ?? 3,
    trailLength: (properties.trailLength as number) ?? tp?.trailLength ?? 0.15,
    motionAngle: (properties.motionAngle as number) ?? tp?.motionAngle ?? 45,
    motionVariation: (properties.motionVariation as number) ?? tp?.motionVariation ?? 12,
    color: (properties.color as string) || tp?.color || "#C8D8FF",
    colorVariation: (properties.colorVariation as number) ?? tp?.colorVariation ?? 0.1,
    opacity: (properties.opacity as number) ?? tp?.opacity ?? 0.85,
    glow: (properties.glow as boolean) ?? tp?.glow ?? true,
    glowColor: (properties.glowColor as string) || tp?.glowColor || "#FFFFFF",
    depthDistribution: (properties.depthDistribution as DepthDistribution) ?? tp?.depthDistribution ?? "uniform",
    depthEasing: (properties.depthEasing as DepthEasing) ?? tp?.depthEasing ?? "linear",
    horizonY: (properties.horizonY as number) ?? tp?.horizonY ?? 0.3,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const trailingLayerType: LayerTypeDefinition = {
  typeId: "particles:trailing",
  displayName: "Trailing Particles",
  icon: "meteor",
  category: "draw",
  properties: TRAILING_PROPERTIES,
  propertyEditorId: "particles:trailing-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(TRAILING_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const rng = mulberry32(p.seed);

    // Trail length in pixels, based on smaller canvas dimension
    const trailPx = p.trailLength * Math.min(width, height);

    // Depth lane attenuation
    const laneConfig = resolveDepthLane(p.depthLane);
    const laneDepth = laneConfig?.depth ?? 0.5;
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;

    for (let i = 0; i < p.count; i++) {
      // Random canvas position (head of streak)
      const x = rng() * width;
      const y = rng() * height;

      // Per-particle motion angle (base + random variation)
      const variation = (rng() - 0.5) * 2 * p.motionVariation;
      const angleRad = ((p.motionAngle + variation) * Math.PI) / 180;
      const dx = Math.cos(angleRad); // direction unit vector
      const dy = Math.sin(angleRad);
      const nx = -dy; // perpendicular (left normal)
      const ny = dx;

      // Depth-based sizing
      const depthSample = sampleDepthDistribution(rng, p.depthDistribution);
      let { size, opacity } = applyDepthToParticle(depthSample, p.sizeMin, p.sizeMax, p.opacity);

      if (subAtt) {
        size *= subAtt.sizeScale;
        opacity *= subAtt.opacity;
      }

      // Color
      let color = p.colorVariation > 0 ? varyColor(p.color, p.colorVariation, rng) : p.color;
      if (p.atmosphericMode !== "none") {
        color = applyAtmosphericDepth(color, laneDepth, p.atmosphericMode);
      }
      const [cr, cg, cb] = parseHex(color);

      // Head and tail world positions
      const hx = bx + x;
      const hy = by + y;
      const tx = hx - dx * trailPx;
      const ty = hy - dy * trailPx;

      const halfW = size * 0.5;

      // Glow halo at head — drawn before streak so streak renders on top
      if (p.glow) {
        const glowR = size * 4;
        const [gr, gg, gb] = parseHex(p.glowColor);
        const glowGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, glowR);
        glowGrad.addColorStop(0, `rgba(${gr},${gg},${gb},0.7)`);
        glowGrad.addColorStop(0.4, `rgba(${gr},${gg},${gb},0.15)`);
        glowGrad.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = glowGrad;
        ctx.fillRect(hx - glowR, hy - glowR, glowR * 2, glowR * 2);
      }

      // Tapered streak: triangle from tail tip → head-left → head-right
      // Linear gradient along motion axis: transparent at tail, opaque at head
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
      grad.addColorStop(0.6, `rgba(${cr},${cg},${cb},0.5)`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},1)`);

      ctx.globalAlpha = opacity;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx + nx * halfW, hy + ny * halfW);
      ctx.lineTo(hx - nx * halfW, hy - ny * halfW);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown trailing preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
