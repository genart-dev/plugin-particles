import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { parseHex } from "../shared/color-utils.js";
import { varyColor } from "../shared/color-utils.js";
import {
  computeDepth,
  applyDepthToParticle,
  sampleDepthDistribution,
} from "../shared/depth.js";
import type { DepthEasing, DepthDistribution } from "../shared/depth.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  laneSubLevelAttenuation,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getFallingShape } from "../shared/shapes.js";
import { getPreset } from "../presets/index.js";
import type { FallingPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FALLING_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "snow",
    group: "preset",
    options: [
      { value: "snow", label: "Snow" },
      { value: "rain", label: "Rain" },
      { value: "autumn-leaves", label: "Autumn Leaves" },
      { value: "petals", label: "Cherry Blossom Petals" },
      { value: "embers", label: "Embers" },
      { value: "ash-fall", label: "Ash Fall" },
      { value: "cherry-blossoms", label: "Cherry Blossoms" },
      { value: "confetti", label: "Confetti" },
      { value: "pine-needles", label: "Pine Needles" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "particleType",
    label: "Particle Type",
    type: "select",
    default: "snowflake",
    group: "shape",
    options: [
      { value: "circle", label: "Circle" },
      { value: "snowflake", label: "Snowflake" },
      { value: "raindrop", label: "Raindrop" },
      { value: "leaf", label: "Leaf" },
      { value: "petal", label: "Petal" },
      { value: "ash", label: "Ash" },
      { value: "dust", label: "Dust" },
      { value: "ember", label: "Ember" },
      { value: "needle", label: "Needle" },
    ],
  },
  { key: "count", label: "Count", type: "number", default: 200, min: 10, max: 5000, step: 10, group: "density" },
  { key: "sizeMin", label: "Size Min", type: "number", default: 2, min: 0.5, max: 50, step: 0.5, group: "size" },
  { key: "sizeMax", label: "Size Max", type: "number", default: 8, min: 0.5, max: 50, step: 0.5, group: "size" },
  { key: "color", label: "Color", type: "color", default: "#FFFFFF", group: "style" },
  { key: "colorVariation", label: "Color Variation", type: "number", default: 0.05, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.8, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "windAngle", label: "Wind Angle", type: "number", default: 15, min: -90, max: 90, step: 5, group: "motion" },
  { key: "windStrength", label: "Wind Strength", type: "number", default: 0.3, min: 0, max: 1, step: 0.05, group: "motion" },
  { key: "fallProgress", label: "Fall Progress", type: "number", default: 0.7, min: 0, max: 1, step: 0.05, group: "motion" },
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
  createDepthLaneProperty("foreground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  particleType: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorVariation: number;
  opacity: number;
  windAngle: number;
  windStrength: number;
  fallProgress: number;
  depthDistribution: DepthDistribution;
  depthEasing: DepthEasing;
  horizonY: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "falling" ? (preset as FallingPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    particleType: (properties.particleType as string) ?? fp?.particleType ?? "snowflake",
    count: (properties.count as number) ?? fp?.count ?? 200,
    sizeMin: (properties.sizeMin as number) ?? fp?.sizeMin ?? 2,
    sizeMax: (properties.sizeMax as number) ?? fp?.sizeMax ?? 8,
    color: (properties.color as string) || fp?.color || "#FFFFFF",
    colorVariation: (properties.colorVariation as number) ?? fp?.colorVariation ?? 0.05,
    opacity: (properties.opacity as number) ?? fp?.opacity ?? 0.8,
    windAngle: (properties.windAngle as number) ?? fp?.windAngle ?? 15,
    windStrength: (properties.windStrength as number) ?? fp?.windStrength ?? 0.3,
    fallProgress: (properties.fallProgress as number) ?? fp?.fallProgress ?? 0.7,
    depthDistribution: (properties.depthDistribution as DepthDistribution) ?? fp?.depthDistribution ?? "uniform",
    depthEasing: (properties.depthEasing as DepthEasing) ?? fp?.depthEasing ?? "linear",
    horizonY: (properties.horizonY as number) ?? fp?.horizonY ?? 0.3,
    depthLane: (properties.depthLane as string) ?? "foreground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const fallingLayerType: LayerTypeDefinition = {
  typeId: "particles:falling",
  displayName: "Falling Particles",
  icon: "snowflake",
  category: "draw",
  properties: FALLING_PROPERTIES,
  propertyEditorId: "particles:falling-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FALLING_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const rng = mulberry32(p.seed);
    const drawShape = getFallingShape(p.particleType);

    const windRad = (p.windAngle * Math.PI) / 180;
    const windShearX = Math.sin(windRad) * p.windStrength;

    // Depth lane attenuation
    const laneConfig = resolveDepthLane(p.depthLane);
    const laneDepth = laneConfig?.depth ?? 0.5;
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;

    for (let i = 0; i < p.count; i++) {
      // Base position
      let x = rng() * width;
      let y = rng() * height * p.fallProgress;

      // Wind displacement
      const normalizedY = y / height;
      x += normalizedY * windShearX * width * 0.5;

      // Wrap horizontally
      x = ((x % width) + width) % width;

      // Depth-based sizing
      const depthSample = sampleDepthDistribution(rng, p.depthDistribution);
      let { size, opacity } = applyDepthToParticle(
        depthSample,
        p.sizeMin,
        p.sizeMax,
        p.opacity,
      );

      // Apply lane sub-level attenuation
      if (subAtt) {
        size *= subAtt.sizeScale;
        opacity *= subAtt.opacity;
      }

      // Color variation
      let color = p.colorVariation > 0
        ? varyColor(p.color, p.colorVariation, rng)
        : p.color;

      // Atmospheric depth color adjustment
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
      errors.push({ property: "preset", message: `Unknown falling preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
