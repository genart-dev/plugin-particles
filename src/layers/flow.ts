import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { generateStrokePolygon } from "@genart-dev/illustration";
import type { StrokeProfile } from "@genart-dev/illustration";
import { mulberry32 } from "../shared/prng.js";
import { createFractalNoise } from "../shared/noise.js";
import { varyColor } from "../shared/color-utils.js";
import { parseHex } from "../shared/color-utils.js";
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
import type { FlowPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const FLOW_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "flow-smoke",
    group: "preset",
    options: [
      { value: "flow-smoke", label: "Smoke Wisps" },
      { value: "ink-diffusion", label: "Ink Diffusion" },
      { value: "aurora", label: "Aurora" },
      { value: "lava-flow", label: "Lava Flow" },
      { value: "water-current", label: "Water Current" },
      { value: "wind-streams", label: "Wind Streams" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "count", label: "Count", type: "number", default: 60, min: 5, max: 500, step: 5, group: "density" },
  { key: "pathSteps", label: "Path Steps", type: "number", default: 80, min: 10, max: 300, step: 5, group: "shape" },
  { key: "stepSize", label: "Step Size", type: "number", default: 0.018, min: 0.002, max: 0.08, step: 0.002, group: "shape" },
  { key: "noiseScale", label: "Noise Scale", type: "number", default: 1.2, min: 0.1, max: 8.0, step: 0.1, group: "field" },
  { key: "noiseOctaves", label: "Noise Octaves", type: "number", default: 3, min: 1, max: 6, step: 1, group: "field" },
  { key: "swirling", label: "Swirling", type: "number", default: 0.15, min: 0, max: 1, step: 0.05, group: "field" },
  { key: "sizeMin", label: "Size Min", type: "number", default: 0.8, min: 0.2, max: 20, step: 0.2, group: "size" },
  { key: "sizeMax", label: "Size Max", type: "number", default: 2.5, min: 0.2, max: 20, step: 0.2, group: "size" },
  { key: "color", label: "Color", type: "color", default: "#C8C8C8", group: "style" },
  { key: "colorVariation", label: "Color Variation", type: "number", default: 0.08, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.55, min: 0, max: 1, step: 0.05, group: "style" },
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
  { key: "horizonY", label: "Horizon Y", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "depth" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  count: number;
  pathSteps: number;
  stepSize: number;
  noiseScale: number;
  noiseOctaves: number;
  swirling: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorVariation: number;
  opacity: number;
  depthDistribution: DepthDistribution;
  depthEasing: DepthEasing;
  horizonY: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const fp = preset?.category === "flow" ? (preset as FlowPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    count: (properties.count as number) ?? fp?.count ?? 60,
    pathSteps: (properties.pathSteps as number) ?? fp?.pathSteps ?? 80,
    stepSize: (properties.stepSize as number) ?? fp?.stepSize ?? 0.018,
    noiseScale: (properties.noiseScale as number) ?? fp?.noiseScale ?? 1.2,
    noiseOctaves: (properties.noiseOctaves as number) ?? fp?.noiseOctaves ?? 3,
    swirling: (properties.swirling as number) ?? fp?.swirling ?? 0.15,
    sizeMin: (properties.sizeMin as number) ?? fp?.sizeMin ?? 0.8,
    sizeMax: (properties.sizeMax as number) ?? fp?.sizeMax ?? 2.5,
    color: (properties.color as string) || fp?.color || "#C8C8C8",
    colorVariation: (properties.colorVariation as number) ?? fp?.colorVariation ?? 0.08,
    opacity: (properties.opacity as number) ?? fp?.opacity ?? 0.55,
    depthDistribution: (properties.depthDistribution as DepthDistribution) ?? fp?.depthDistribution ?? "uniform",
    depthEasing: (properties.depthEasing as DepthEasing) ?? fp?.depthEasing ?? "linear",
    horizonY: (properties.horizonY as number) ?? fp?.horizonY ?? 0.4,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/**
 * Compute curl of a 2D scalar noise field via finite differences.
 * curl_x = ∂N/∂y, curl_y = -∂N/∂x
 * Returns a normalised direction vector [dx, dy].
 */
function curlAt(
  nx: number,
  ny: number,
  noise: (x: number, y: number) => number,
  swirling: number,
): [number, number] {
  const eps = 0.01;
  const ddx = (noise(nx + eps, ny) - noise(nx - eps, ny)) / (2 * eps);
  const ddy = (noise(nx, ny + eps) - noise(nx, ny - eps)) / (2 * eps);
  // Rotate curl by swirling * π/2 to add spiral bias
  const angle = Math.atan2(ddy, -ddx) + swirling * Math.PI * 0.5;
  return [Math.cos(angle), Math.sin(angle)];
}

export const flowLayerType: LayerTypeDefinition = {
  typeId: "particles:flow",
  displayName: "Flow Particles",
  icon: "wind",
  category: "draw",
  properties: FLOW_PROPERTIES,
  propertyEditorId: "particles:flow-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(FLOW_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const minDim = Math.min(width, height);
    const rng = mulberry32(p.seed);

    const noise = createFractalNoise(p.seed, p.noiseOctaves);
    const stepPx = p.stepSize * minDim;

    // Depth lane attenuation
    const laneConfig = resolveDepthLane(p.depthLane);
    const laneDepth = laneConfig?.depth ?? 0.5;
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;

    for (let i = 0; i < p.count; i++) {
      // Start position and depth
      const startX = rng() * width;
      const startY = rng() * height;
      const depthT = sampleDepthDistribution(rng, p.depthDistribution);

      let { size, opacity } = applyDepthToParticle(depthT, p.sizeMin, p.sizeMax, p.opacity);
      if (subAtt) {
        size *= subAtt.sizeScale;
        opacity *= subAtt.opacity;
      }

      let color = p.colorVariation > 0 ? varyColor(p.color, p.colorVariation, rng) : p.color;
      if (p.atmosphericMode !== "none") {
        color = applyAtmosphericDepth(color, laneDepth, p.atmosphericMode);
      }

      // Trace path through curl field
      const points: Array<{ x: number; y: number; width: number }> = [];
      let cx = startX;
      let cy = startY;

      for (let step = 0; step < p.pathSteps; step++) {
        // Width taper: sin curve — 0 at start and end, max at middle
        const t = step / (p.pathSteps - 1);
        const widthScale = Math.sin(Math.PI * t);
        points.push({ x: cx, y: cy, width: size * widthScale });

        // Sample noise in normalised coordinates scaled by noiseScale
        const nx = (cx / minDim) * p.noiseScale;
        const ny = (cy / minDim) * p.noiseScale;
        const [dx, dy] = curlAt(nx, ny, noise, p.swirling);
        cx += dx * stepPx;
        cy += dy * stepPx;
      }

      if (points.length < 2) continue;

      const profile: StrokeProfile = {
        points,
        cap: "pointed",
      };

      const polygon = generateStrokePolygon(profile);
      if (!polygon || polygon.length < 3) continue;

      const [cr, cg, cb] = parseHex(color);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.moveTo(bx + polygon[0]!.x, by + polygon[0]!.y);
      for (let j = 1; j < polygon.length; j++) {
        ctx.lineTo(bx + polygon[j]!.x, by + polygon[j]!.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown flow preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
