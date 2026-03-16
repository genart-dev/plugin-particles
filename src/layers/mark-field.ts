import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { generateStrokePolygon } from "@genart-dev/illustration";
import type { StrokeProfile } from "@genart-dev/illustration";
import { mulberry32 } from "../shared/prng.js";
import { varyColor } from "../shared/color-utils.js";
import { parseHex } from "../shared/color-utils.js";
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
import { getPreset } from "../presets/index.js";
import type { MarkFieldPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

type MarkStyle = "ink" | "brush" | "pencil" | "technical";

const MARK_FIELD_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "grass-blades",
    group: "preset",
    options: [
      { value: "grass-blades", label: "Grass Blades" },
      { value: "reed-field", label: "Reed Field" },
      { value: "ink-scatter", label: "Ink Scatter" },
      { value: "dry-brush", label: "Dry Brush" },
      { value: "charcoal-scatter", label: "Charcoal Scatter" },
      { value: "calligraphy-marks", label: "Calligraphy Marks" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "count", label: "Count", type: "number", default: 300, min: 10, max: 2000, step: 10, group: "density" },
  { key: "markLength", label: "Mark Length", type: "number", default: 0.04, min: 0.005, max: 0.3, step: 0.005, group: "shape" },
  { key: "markWidth", label: "Mark Width", type: "number", default: 1.5, min: 0.2, max: 12, step: 0.2, group: "shape" },
  { key: "angle", label: "Angle (°)", type: "number", default: -80, min: -180, max: 180, step: 5, group: "shape" },
  { key: "angleVariation", label: "Angle Variation (°)", type: "number", default: 20, min: 0, max: 180, step: 5, group: "shape" },
  { key: "curvature", label: "Curvature", type: "number", default: 0.25, min: 0, max: 1, step: 0.05, group: "shape" },
  {
    key: "markStyle",
    label: "Mark Style",
    type: "select",
    default: "ink",
    group: "shape",
    options: [
      { value: "ink", label: "Ink" },
      { value: "brush", label: "Brush" },
      { value: "pencil", label: "Pencil" },
      { value: "technical", label: "Technical" },
    ],
  },
  { key: "color", label: "Color", type: "color", default: "#1C1C1C", group: "style" },
  { key: "colorVariation", label: "Color Variation", type: "number", default: 0.08, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.7, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "depthBandMin", label: "Depth Band Min", type: "number", default: 0.1, min: 0, max: 1, step: 0.05, group: "depth" },
  { key: "depthBandMax", label: "Depth Band Max", type: "number", default: 0.9, min: 0, max: 1, step: 0.05, group: "depth" },
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
  { key: "horizonY", label: "Horizon Y", type: "number", default: 0.45, min: 0, max: 1, step: 0.05, group: "depth" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  count: number;
  markLength: number;
  markWidth: number;
  angle: number;
  angleVariation: number;
  curvature: number;
  markStyle: MarkStyle;
  color: string;
  colorVariation: number;
  opacity: number;
  depthBandMin: number;
  depthBandMax: number;
  depthEasing: DepthEasing;
  horizonY: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const mp = preset?.category === "mark-field" ? (preset as MarkFieldPreset) : undefined;

  return {
    seed: (properties.seed as number) ?? 42,
    count: (properties.count as number) ?? mp?.count ?? 300,
    markLength: (properties.markLength as number) ?? mp?.markLength ?? 0.04,
    markWidth: (properties.markWidth as number) ?? mp?.markWidth ?? 1.5,
    angle: (properties.angle as number) ?? mp?.angle ?? -80,
    angleVariation: (properties.angleVariation as number) ?? mp?.angleVariation ?? 20,
    curvature: (properties.curvature as number) ?? mp?.curvature ?? 0.25,
    markStyle: (properties.markStyle as MarkStyle) ?? mp?.markStyle ?? "ink",
    color: (properties.color as string) || mp?.color || "#1C1C1C",
    colorVariation: (properties.colorVariation as number) ?? mp?.colorVariation ?? 0.08,
    opacity: (properties.opacity as number) ?? mp?.opacity ?? 0.7,
    depthBandMin: (properties.depthBandMin as number) ?? mp?.depthBandMin ?? 0.1,
    depthBandMax: (properties.depthBandMax as number) ?? mp?.depthBandMax ?? 0.9,
    depthEasing: (properties.depthEasing as DepthEasing) ?? mp?.depthEasing ?? "linear",
    horizonY: (properties.horizonY as number) ?? mp?.horizonY ?? 0.45,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

/**
 * Build a StrokeProfile for a single mark.
 * Centerline: 5 points along the mark direction with optional curvature (midpoint perpendicular displacement).
 * Width: rises from 0 to max at the widthPeak position, then falls back to 0.
 * markStyle affects the peak position and cap:
 *   ink     — peak at 0.4 (asymmetric, sharp at tip)
 *   brush   — peak at 0.3 (quick swell then long taper)
 *   pencil  — peak at 0.5 (symmetric, soft cap)
 *   technical — peak at 0.5 (symmetric, flat cap, no curvature)
 */
function buildMarkProfile(
  x: number,
  y: number,
  angleDeg: number,
  lengthPx: number,
  maxWidth: number,
  curvature: number,
  markStyle: MarkStyle,
): StrokeProfile {
  const angleRad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  // Perpendicular for curvature displacement
  const px = -dy;
  const py = dx;

  const NUM_POINTS = 5;
  const peakT = markStyle === "brush" ? 0.3 : markStyle === "ink" ? 0.4 : 0.5;
  const capStyle = markStyle === "technical" ? "flat" : markStyle === "pencil" ? "round" : "pointed";

  // Curvature: bow the midpoint perpendicular — disabled for technical style
  const bowAmplitude = markStyle === "technical" ? 0 : curvature * lengthPx * 0.4;

  const points = Array.from({ length: NUM_POINTS }, (_, i) => {
    const t = i / (NUM_POINTS - 1);
    // Width: ramp up to peakT, then ramp down
    const w =
      t <= peakT
        ? (t / peakT) * maxWidth
        : ((1 - t) / (1 - peakT)) * maxWidth;
    // Curvature: sin arch on the perpendicular axis
    const bow = bowAmplitude * Math.sin(Math.PI * t);
    return {
      x: x + t * lengthPx * dx + bow * px,
      y: y + t * lengthPx * dy + bow * py,
      width: w,
    };
  });

  return { points, cap: capStyle };
}

export const markFieldLayerType: LayerTypeDefinition = {
  typeId: "particles:mark-field",
  displayName: "Mark Field",
  icon: "pen",
  category: "draw",
  properties: MARK_FIELD_PROPERTIES,
  propertyEditorId: "particles:mark-field-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(MARK_FIELD_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;
    const minDim = Math.min(width, height);
    const rng = mulberry32(p.seed);

    const bandHeight = p.depthBandMax - p.depthBandMin;
    const laneConfig = resolveDepthLane(p.depthLane);
    const laneDepth = laneConfig?.depth ?? 0.5;
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;

    for (let i = 0; i < p.count; i++) {
      // Position within depth band
      const depthT = rng();
      const normalizedY = p.depthBandMin + depthT * bandHeight;
      const markX = rng() * width;
      const markY = normalizedY * height;

      // Depth-based size and opacity
      let { size: sizeScale, opacity } = applyDepthToParticle(
        depthT,
        0.4,
        1.0,
        p.opacity,
      );
      if (subAtt) {
        sizeScale *= subAtt.sizeScale;
        opacity *= subAtt.opacity;
      }

      const lengthPx = p.markLength * minDim * sizeScale;
      const halfLength = lengthPx * 0.5;
      // Start at centre minus half length along the mark direction
      const angleRad = (p.angle * Math.PI) / 180;
      const startX = markX - halfLength * Math.cos(angleRad);
      const startY = markY - halfLength * Math.sin(angleRad);

      // Per-mark angle variation
      const variation = (rng() - 0.5) * 2 * p.angleVariation;
      const finalAngle = p.angle + variation;

      // Color
      let color = p.colorVariation > 0 ? varyColor(p.color, p.colorVariation, rng) : p.color;
      if (p.atmosphericMode !== "none") {
        color = applyAtmosphericDepth(color, laneDepth, p.atmosphericMode);
      }

      const profile = buildMarkProfile(
        startX,
        startY,
        finalAngle,
        lengthPx,
        p.markWidth * sizeScale,
        p.curvature,
        p.markStyle,
      );

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
      errors.push({ property: "preset", message: `Unknown mark-field preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
