import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { applyDepthToParticle } from "../shared/depth.js";
import type { DepthEasing } from "../shared/depth.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  laneSubLevelAttenuation,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getFloatingShape } from "../shared/shapes.js";
import { getPreset } from "../presets/index.js";
import type { FloatingPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FLOATING_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "dust-motes",
    group: "preset",
    options: [
      { value: "dust-motes", label: "Dust Motes" },
      { value: "fireflies", label: "Fireflies" },
      { value: "fog-wisps", label: "Fog Wisps" },
      { value: "pollen", label: "Pollen" },
      { value: "dandelion-seeds", label: "Dandelion Seeds" },
      { value: "butterflies", label: "Butterflies" },
      { value: "bubbles", label: "Bubbles" },
      { value: "sparkles", label: "Sparkles" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "particleType",
    label: "Particle Type",
    type: "select",
    default: "dot",
    group: "shape",
    options: [
      { value: "dot", label: "Dot" },
      { value: "wisp", label: "Wisp" },
      { value: "firefly", label: "Firefly" },
      { value: "pollen", label: "Pollen" },
      { value: "sparkle", label: "Sparkle" },
      { value: "butterfly", label: "Butterfly" },
      { value: "bubble", label: "Bubble" },
      { value: "seed-tuft", label: "Seed Tuft" },
    ],
  },
  { key: "count", label: "Count", type: "number", default: 100, min: 5, max: 2000, step: 5, group: "density" },
  { key: "sizeMin", label: "Size Min", type: "number", default: 1, min: 0.5, max: 50, step: 0.5, group: "size" },
  { key: "sizeMax", label: "Size Max", type: "number", default: 3, min: 0.5, max: 50, step: 0.5, group: "size" },
  { key: "color", label: "Color", type: "color", default: "#F5DEB3", group: "style" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "glow", label: "Glow", type: "boolean", default: false, group: "style" },
  { key: "glowColor", label: "Glow Color", type: "color", default: "#FFFFFF", group: "style" },
  { key: "driftRange", label: "Drift Range", type: "number", default: 5, min: 0, max: 50, step: 1, group: "motion" },
  { key: "driftPhase", label: "Drift Phase", type: "number", default: 0, min: 0, max: 6.28, step: 0.1, group: "motion" },
  { key: "depthBandMin", label: "Depth Band Min", type: "number", default: 0.2, min: 0, max: 1, step: 0.05, group: "depth" },
  { key: "depthBandMax", label: "Depth Band Max", type: "number", default: 0.8, min: 0, max: 1, step: 0.05, group: "depth" },
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
  { key: "horizonY", label: "Horizon Y", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "depth" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  particleType: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  opacity: number;
  glow: boolean;
  glowColor: string;
  driftRange: number;
  driftPhase: number;
  depthBandMin: number;
  depthBandMax: number;
  depthEasing: DepthEasing;
  horizonY: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "floating" ? (preset as FloatingPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    particleType: (properties.particleType as string) ?? fp?.particleType ?? "dot",
    count: (properties.count as number) ?? fp?.count ?? 100,
    sizeMin: (properties.sizeMin as number) ?? fp?.sizeMin ?? 1,
    sizeMax: (properties.sizeMax as number) ?? fp?.sizeMax ?? 3,
    color: (properties.color as string) || fp?.color || "#F5DEB3",
    opacity: (properties.opacity as number) ?? fp?.opacity ?? 0.4,
    glow: (properties.glow as boolean) ?? fp?.glow ?? false,
    glowColor: (properties.glowColor as string) || fp?.glowColor || "#FFFFFF",
    driftRange: (properties.driftRange as number) ?? fp?.driftRange ?? 5,
    driftPhase: (properties.driftPhase as number) ?? fp?.driftPhase ?? 0,
    depthBandMin: (properties.depthBandMin as number) ?? fp?.depthBandMin ?? 0.2,
    depthBandMax: (properties.depthBandMax as number) ?? fp?.depthBandMax ?? 0.8,
    depthEasing: (properties.depthEasing as DepthEasing) ?? fp?.depthEasing ?? "linear",
    horizonY: (properties.horizonY as number) ?? fp?.horizonY ?? 0.4,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const floatingLayerType: LayerTypeDefinition = {
  typeId: "particles:floating",
  displayName: "Floating Particles",
  icon: "sparkle",
  category: "draw",
  properties: FLOATING_PROPERTIES,
  propertyEditorId: "particles:floating-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FLOATING_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const rng = mulberry32(p.seed);
    const drawShape = getFloatingShape(p.particleType);

    const bandHeight = p.depthBandMax - p.depthBandMin;

    // Depth lane attenuation
    const laneConfig = resolveDepthLane(p.depthLane);
    const laneDepth = laneConfig?.depth ?? 0.5;
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;

    for (let i = 0; i < p.count; i++) {
      // Position within depth band
      const depthT = rng(); // 0-1 within band
      const normalizedY = p.depthBandMin + depthT * bandHeight;
      const baseX = rng() * width;
      const baseY = normalizedY * height;

      // Sinusoidal drift displacement
      const driftX = Math.sin(p.driftPhase + i * 1.7) * p.driftRange;
      const driftY = Math.cos(p.driftPhase + i * 2.3) * p.driftRange * 0.5;

      const x = baseX + driftX;
      const y = baseY + driftY;

      // Depth-based sizing
      let { size, opacity } = applyDepthToParticle(
        depthT,
        p.sizeMin,
        p.sizeMax,
        p.opacity,
      );

      // Apply lane sub-level attenuation
      if (subAtt) {
        size *= subAtt.sizeScale;
        opacity *= subAtt.opacity;
      }

      // Atmospheric depth color adjustment
      let color = p.color;
      if (p.atmosphericMode !== "none") {
        color = applyAtmosphericDepth(color, laneDepth, p.atmosphericMode);
      }

      const rotation = rng() * Math.PI * 2;

      ctx.globalAlpha = opacity;
      drawShape(ctx, bx + x, by + y, size, rotation, color, rng);
    }

    ctx.globalAlpha = 1;
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown floating preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
