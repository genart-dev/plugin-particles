import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { mulberry32 } from "../shared/prng.js";
import { varyColor } from "../shared/color-utils.js";
import { computeDepth, applyDepthToParticle } from "../shared/depth.js";
import type { DepthEasing } from "../shared/depth.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  laneSubLevelAttenuation,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getScatterShape } from "../shared/shapes.js";
import { getPreset } from "../presets/index.js";
import type { ScatterPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

type ScatterDistribution = "uniform" | "clustered" | "edge-weighted" | "center-weighted";

const SCATTER_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "fallen-leaves",
    group: "preset",
    options: [
      { value: "fallen-leaves", label: "Fallen Leaves" },
      { value: "pebbles", label: "Pebbles" },
      { value: "wildflowers", label: "Wildflowers" },
      { value: "shells", label: "Shells" },
      { value: "acorns", label: "Acorns" },
      { value: "sea-foam", label: "Sea Foam" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  {
    key: "elementType",
    label: "Element Type",
    type: "select",
    default: "leaf",
    group: "shape",
    options: [
      { value: "leaf", label: "Leaf" },
      { value: "stone", label: "Stone" },
      { value: "flower", label: "Flower" },
      { value: "debris", label: "Debris" },
      { value: "petal", label: "Petal" },
      { value: "acorn", label: "Acorn" },
      { value: "shell", label: "Shell" },
    ],
  },
  { key: "count", label: "Count", type: "number", default: 80, min: 5, max: 2000, step: 5, group: "density" },
  { key: "sizeMin", label: "Size Min", type: "number", default: 8, min: 1, max: 50, step: 1, group: "size" },
  { key: "sizeMax", label: "Size Max", type: "number", default: 22, min: 1, max: 50, step: 1, group: "size" },
  { key: "color", label: "Color", type: "color", default: "#B8652A", group: "style" },
  { key: "colorVariation", label: "Color Variation", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "rotationRange", label: "Rotation Range", type: "number", default: 6.28, min: 0, max: 6.28, step: 0.1, group: "style" },
  {
    key: "distribution",
    label: "Distribution",
    type: "select",
    default: "clustered",
    group: "placement",
    options: [
      { value: "uniform", label: "Uniform" },
      { value: "clustered", label: "Clustered" },
      { value: "edge-weighted", label: "Edge Weighted" },
      { value: "center-weighted", label: "Center Weighted" },
    ],
  },
  { key: "clusterStrength", label: "Cluster Strength", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "placement" },
  { key: "groundY", label: "Ground Y", type: "number", default: 0.7, min: 0.1, max: 1, step: 0.05, group: "layout" },
  { key: "horizonY", label: "Horizon Y", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "depth" },
  {
    key: "depthEasing",
    label: "Depth Easing",
    type: "select",
    default: "quadratic",
    group: "depth",
    options: [
      { value: "linear", label: "Linear" },
      { value: "quadratic", label: "Quadratic" },
      { value: "cubic", label: "Cubic" },
      { value: "exponential", label: "Exponential" },
    ],
  },
  createDepthLaneProperty("ground-plane"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  elementType: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorVariation: number;
  rotationRange: number;
  distribution: ScatterDistribution;
  clusterStrength: number;
  groundY: number;
  horizonY: number;
  depthEasing: DepthEasing;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const sp = preset?.category === "scatter" ? (preset as ScatterPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    elementType: (properties.elementType as string) ?? sp?.elementType ?? "leaf",
    count: (properties.count as number) ?? sp?.count ?? 80,
    sizeMin: (properties.sizeMin as number) ?? sp?.sizeMin ?? 8,
    sizeMax: (properties.sizeMax as number) ?? sp?.sizeMax ?? 22,
    color: (properties.color as string) || sp?.color || "#B8652A",
    colorVariation: (properties.colorVariation as number) ?? sp?.colorVariation ?? 0.35,
    rotationRange: (properties.rotationRange as number) ?? sp?.rotationRange ?? Math.PI * 2,
    distribution: (properties.distribution as ScatterDistribution) ?? sp?.distribution ?? "clustered",
    clusterStrength: (properties.clusterStrength as number) ?? sp?.clusterStrength ?? 0.4,
    groundY: (properties.groundY as number) ?? sp?.groundY ?? 0.7,
    horizonY: (properties.horizonY as number) ?? sp?.horizonY ?? 0.35,
    depthEasing: (properties.depthEasing as DepthEasing) ?? sp?.depthEasing ?? "quadratic",
    depthLane: (properties.depthLane as string) ?? "ground-plane",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

function sampleDistribution(
  rng: () => number,
  distribution: ScatterDistribution,
  clusterStrength: number,
  clusterCenters: Array<{ x: number; y: number }>,
): { x: number; y: number } {
  let x = rng();
  let y = rng();

  switch (distribution) {
    case "uniform":
      break;
    case "clustered": {
      // Bug 4 fix: cluster only biases x (horizontal grouping), not y (depth).
      // Biasing y would pile elements at identical depths, which looks wrong.
      if (clusterCenters.length > 0 && clusterStrength > 0) {
        const center = clusterCenters[Math.floor(rng() * clusterCenters.length)]!;
        x = x * (1 - clusterStrength) + center.x * clusterStrength + (rng() - 0.5) * 0.2;
      }
      break;
    }
    case "edge-weighted":
      x = x < 0.5 ? x * x * 2 : 1 - (1 - x) * (1 - x) * 2;
      break;
    case "center-weighted":
      x = (rng() + rng() + rng()) / 3;
      y = (rng() + rng() + rng()) / 3;
      break;
  }

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

export const scatterLayerType: LayerTypeDefinition = {
  typeId: "particles:scatter",
  displayName: "Scatter",
  icon: "scatter",
  category: "draw",
  properties: SCATTER_PROPERTIES,
  propertyEditorId: "particles:scatter-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(SCATTER_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const rng = mulberry32(p.seed);
    const drawShape = getScatterShape(p.elementType);

    const clusterCount = 3 + Math.floor(rng() * 4);
    const clusterCenters = Array.from({ length: clusterCount }, () => ({
      x: rng(),
      y: rng(),
    }));

    const groundZone = 1 - p.groundY;

    // Depth lane attenuation
    const laneConfig = resolveDepthLane(p.depthLane);
    const laneDepth = laneConfig?.depth ?? 0.5;
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;

    // Generate all particles first (preserves deterministic rng order),
    // then sort back-to-front so foreground elements overdraw background ones.
    interface ScatterParticle {
      x: number;
      normalizedY: number;
      size: number;
      opacity: number;
      color: string;
      rotation: number;
      shapeSeed: number;
    }

    const particles: ScatterParticle[] = [];

    for (let i = 0; i < p.count; i++) {
      const { x: nx, y: ny } = sampleDistribution(
        rng,
        p.distribution,
        p.clusterStrength,
        clusterCenters,
      );

      const x = nx * width;
      const normalizedY = p.groundY + ny * groundZone;

      const depth = computeDepth(normalizedY, {
        horizonY: p.horizonY,
        easing: p.depthEasing,
        distribution: "uniform",
      });

      let { size, opacity } = applyDepthToParticle(depth, p.sizeMin, p.sizeMax, 1);

      if (subAtt) {
        size *= subAtt.sizeScale;
        opacity *= subAtt.opacity;
      }

      let color = p.colorVariation > 0
        ? varyColor(p.color, p.colorVariation, rng)
        : p.color;

      if (p.atmosphericMode !== "none") {
        color = applyAtmosphericDepth(color, laneDepth, p.atmosphericMode);
      }

      const rotation = (rng() - 0.5) * p.rotationRange;
      // Capture a per-particle seed for shape-internal rng so draw order doesn't affect appearance
      const shapeSeed = Math.floor(rng() * 0x100000000);

      particles.push({ x, normalizedY, size, opacity, color, rotation, shapeSeed });
    }

    // Sort back-to-front: smaller normalizedY = closer to horizon = drawn first
    particles.sort((a, b) => a.normalizedY - b.normalizedY);

    for (const part of particles) {
      const shapeRng = mulberry32(part.shapeSeed);
      ctx.globalAlpha = part.opacity;
      drawShape(ctx, bx + part.x, by + part.normalizedY * height, part.size, part.rotation, part.color, shapeRng);
    }

    ctx.globalAlpha = 1;
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown scatter preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
