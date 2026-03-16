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
  { key: "flowAngle", label: "Flow Angle", type: "number", default: 0, min: 0, max: 360, step: 5, group: "field" },
  { key: "flowStrength", label: "Flow Strength", type: "number", default: 0, min: 0, max: 1, step: 0.05, group: "field" },
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
  flowAngle: number;
  flowStrength: number;
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
    flowAngle: (properties.flowAngle as number) ?? fp?.flowAngle ?? 0,
    flowStrength: (properties.flowStrength as number) ?? fp?.flowStrength ?? 0,
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
 * Compute curl of a 2D scalar noise field via finite differences,
 * blended with an optional dominant flow direction.
 *
 * curl_x = ∂N/∂y, curl_y = -∂N/∂x
 * Returns a normalised direction vector [dx, dy].
 */
function curlAt(
  nx: number,
  ny: number,
  noise: (x: number, y: number) => number,
  swirling: number,
  flowAngle: number = 0,
  flowStrength: number = 0,
): [number, number] {
  const eps = 0.01;
  const ddx = (noise(nx + eps, ny) - noise(nx - eps, ny)) / (2 * eps);
  const ddy = (noise(nx, ny + eps) - noise(nx, ny - eps)) / (2 * eps);
  // Rotate curl by swirling * π/2 to add spiral bias
  const angle = Math.atan2(ddy, -ddx) + swirling * Math.PI * 0.5;
  const curlDx = Math.cos(angle);
  const curlDy = Math.sin(angle);

  if (flowStrength <= 0) return [curlDx, curlDy];

  // Blend curl with a dominant flow direction
  const flowRad = (flowAngle * Math.PI) / 180;
  const bx = (1 - flowStrength) * curlDx + flowStrength * Math.cos(flowRad);
  const by = (1 - flowStrength) * curlDy + flowStrength * Math.sin(flowRad);
  const len = Math.sqrt(bx * bx + by * by);
  return len > 0.001 ? [bx / len, by / len] : [Math.cos(flowRad), Math.sin(flowRad)];
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
      // Collect raw positions first, then apply sin taper based on actual count.
      const rawPts: Array<{ x: number; y: number }> = [];
      let cx = startX;
      let cy = startY;

      let prevDx = 0, prevDy = 0;
      let cumAngle = 0, prevAngle = 0;
      let hasDir = false;
      // Loop detection: return-to-start within 5 step-lengths after ≥25% of path
      const loopDistSq = (stepPx * 5) * (stepPx * 5);
      const minLoopStep = Math.max(8, Math.floor(p.pathSteps * 0.25));

      for (let step = 0; step < p.pathSteps; step++) {
        const nx = (cx / minDim) * p.noiseScale;
        const ny = (cy / minDim) * p.noiseScale;
        const [dx, dy] = curlAt(nx, ny, noise, p.swirling, p.flowAngle, p.flowStrength);

        if (hasDir) {
          // Break on sharp direction reversal (>~115°)
          if (dx * prevDx + dy * prevDy < -0.4) break;
          // Accumulate rotation; break at 1.5 full turns as safety cap
          const angle = Math.atan2(dy, dx);
          let delta = angle - prevAngle;
          if (delta > Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          cumAngle += delta;
          if (Math.abs(cumAngle) > 3 * Math.PI) break;
          prevAngle = angle;
          // Closed-orbit detection: stop if path returns near its start point
          if (step >= minLoopStep) {
            const dsx = cx - startX, dsy = cy - startY;
            if (dsx * dsx + dsy * dsy < loopDistSq) break;
          }
        } else {
          prevAngle = Math.atan2(dy, dx);
          hasDir = true;
        }

        rawPts.push({ x: cx, y: cy });
        prevDx = dx; prevDy = dy;
        cx += dx * stepPx;
        cy += dy * stepPx;
      }

      if (rawPts.length < 2) continue;

      // Apply sin taper based on actual count so both ends always taper to 0
      const n = rawPts.length;
      const points = rawPts.map((pt, i) => ({
        ...pt,
        width: size * Math.sin(Math.PI * (i / (n - 1))),
      }));

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
