import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  ValidationError,
} from "@genart-dev/core";
import { createFractalNoise } from "../shared/noise.js";
import { parseHex } from "../shared/color-utils.js";
import {
  createDepthLaneProperty,
  createAtmosphericModeProperty,
  resolveDepthLane,
  laneSubLevelAttenuation,
  applyAtmosphericDepth,
} from "../shared/depth-lanes.js";
import type { AtmosphericMode } from "../shared/depth-lanes.js";
import { getPreset } from "../presets/index.js";
import type { MistPreset } from "../presets/types.js";
import { createDefaultProps } from "./shared.js";

const MIST_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "morning-mist",
    group: "preset",
    options: [
      { value: "morning-mist", label: "Morning Mist" },
      { value: "valley-fog", label: "Valley Fog" },
      { value: "mountain-haze", label: "Mountain Haze" },
      { value: "ground-steam", label: "Ground Steam" },
      { value: "ground-steam-thick", label: "Ground Steam (Thick)" },
      { value: "smoke-wisps", label: "Smoke Wisps" },
    ],
  },
  { key: "seed", label: "Seed", type: "number", default: 42, min: 0, max: 99999, step: 1, group: "generation" },
  { key: "density", label: "Density", type: "number", default: 0.4, min: 0, max: 1, step: 0.05, group: "shape" },
  { key: "color", label: "Color", type: "color", default: "#E8E8F0", group: "style" },
  { key: "colorBottom", label: "Color Bottom", type: "color", default: "", group: "style" },
  { key: "opacity", label: "Opacity", type: "number", default: 0.35, min: 0, max: 1, step: 0.05, group: "style" },
  { key: "bandTop", label: "Band Top", type: "number", default: 0.5, min: 0, max: 1, step: 0.05, group: "layout" },
  { key: "bandBottom", label: "Band Bottom", type: "number", default: 0.8, min: 0, max: 1, step: 0.05, group: "layout" },
  { key: "edgeSoftness", label: "Edge Softness", type: "number", default: 0.3, min: 0.05, max: 0.8, step: 0.05, group: "shape" },
  { key: "noiseScale", label: "Noise Scale", type: "number", default: 3.0, min: 0.5, max: 10, step: 0.5, group: "shape" },
  { key: "noiseOctaves", label: "Noise Octaves", type: "number", default: 3, min: 1, max: 6, step: 1, group: "shape" },
  { key: "driftX", label: "Drift X", type: "number", default: 0.1, min: 0, max: 1, step: 0.05, group: "motion" },
  { key: "driftY", label: "Drift Y", type: "number", default: 0, min: -1, max: 1, step: 0.05, group: "motion" },
  { key: "driftPhase", label: "Drift Phase", type: "number", default: 0, min: 0, max: 6.28, step: 0.1, group: "motion" },
  { key: "layerCount", label: "Layer Count", type: "number", default: 3, min: 1, max: 8, step: 1, group: "depth" },
  { key: "depthSpread", label: "Depth Spread", type: "number", default: 0.2, min: 0, max: 0.5, step: 0.05, group: "depth" },
  createDepthLaneProperty("midground"),
  createAtmosphericModeProperty(),
];

function resolveProps(properties: LayerProperties): {
  seed: number;
  density: number;
  color: string;
  colorBottom: string;
  opacity: number;
  bandTop: number;
  bandBottom: number;
  edgeSoftness: number;
  noiseScale: number;
  noiseOctaves: number;
  driftX: number;
  driftY: number;
  driftPhase: number;
  layerCount: number;
  depthSpread: number;
  depthLane: string;
  atmosphericMode: AtmosphericMode;
} {
  const presetId = properties.preset as string | undefined;
  const preset = presetId ? getPreset(presetId) : undefined;
  const mp = preset?.category === "mist" ? (preset as MistPreset) : undefined;

  const topColor = (properties.color as string) || mp?.color || "#E8E8F0";
  return {
    seed: (properties.seed as number) ?? 42,
    density: (properties.density as number) ?? mp?.density ?? 0.4,
    color: topColor,
    colorBottom: (properties.colorBottom as string) || mp?.colorBottom || topColor,
    opacity: (properties.opacity as number) ?? mp?.opacity ?? 0.35,
    bandTop: (properties.bandTop as number) ?? mp?.bandTop ?? 0.5,
    bandBottom: (properties.bandBottom as number) ?? mp?.bandBottom ?? 0.8,
    edgeSoftness: (properties.edgeSoftness as number) ?? mp?.edgeSoftness ?? 0.3,
    noiseScale: (properties.noiseScale as number) ?? mp?.noiseScale ?? 3.0,
    noiseOctaves: (properties.noiseOctaves as number) ?? mp?.noiseOctaves ?? 3,
    driftX: (properties.driftX as number) ?? mp?.driftX ?? 0.1,
    driftY: (properties.driftY as number) ?? mp?.driftY ?? 0,
    driftPhase: (properties.driftPhase as number) ?? mp?.driftPhase ?? 0,
    layerCount: (properties.layerCount as number) ?? mp?.layerCount ?? 3,
    depthSpread: (properties.depthSpread as number) ?? mp?.depthSpread ?? 0.2,
    depthLane: (properties.depthLane as string) ?? "midground",
    atmosphericMode: (properties.atmosphericMode as AtmosphericMode) ?? "none",
  };
}

export const mistLayerType: LayerTypeDefinition = {
  typeId: "particles:mist",
  displayName: "Mist",
  icon: "mist",
  category: "draw",
  properties: MIST_PROPERTIES,
  propertyEditorId: "particles:mist-editor",

  createDefault(): LayerProperties {
    return createDefaultProps(MIST_PROPERTIES);
  },

  render(properties, ctx, bounds): void {
    const p = resolveProps(properties);
    const { width, height, x: bx, y: by } = bounds;

    const bandTopPx = Math.round(by + height * p.bandTop);
    const bandBottomPx = Math.round(by + height * p.bandBottom);
    const bandHeight = bandBottomPx - bandTopPx;

    if (bandHeight <= 0) return;

    // Apply atmospheric depth to mist color
    let mistColor = p.color;
    if (p.atmosphericMode !== "none") {
      const laneConfig = resolveDepthLane(p.depthLane);
      const laneDepth = laneConfig?.depth ?? 0.5;
      mistColor = applyAtmosphericDepth(mistColor, laneDepth, p.atmosphericMode);
    }

    const [topR, topG, topB] = parseHex(mistColor);
    // colorBottom: apply same atmospheric depth as top color
    let bottomColor = p.colorBottom;
    if (p.atmosphericMode !== "none" && bottomColor !== mistColor) {
      const laneConfig2 = resolveDepthLane(p.depthLane);
      const laneDepth2 = laneConfig2?.depth ?? 0.5;
      bottomColor = applyAtmosphericDepth(bottomColor, laneDepth2, p.atmosphericMode);
    }
    const [botR, botG, botB] = parseHex(bottomColor);

    // Lane sub-level opacity attenuation
    const laneConfig = resolveDepthLane(p.depthLane);
    const subAtt = laneConfig ? laneSubLevelAttenuation(laneConfig.subLevel) : null;
    const opacityMult = subAtt?.opacity ?? 1;

    // Render at 1/4 resolution for performance
    const renderScale = 0.25;
    const rw = Math.max(1, Math.round(width * renderScale));
    const rh = Math.max(1, Math.round(bandHeight * renderScale));

    const imageData = ctx.createImageData(rw, rh);
    const data = imageData.data;

    // Threshold from density: lower threshold = more fog
    const threshold = 1 - p.density;

    for (let layer = 0; layer < p.layerCount; layer++) {
      const layerSeed = p.seed + layer * 4231;
      const noise = createFractalNoise(layerSeed, p.noiseOctaves, 2.0, 0.5);
      const layerOffset = (layer - p.layerCount / 2) * p.depthSpread;
      const layerOpacity = (p.opacity * opacityMult) / p.layerCount;

      // Bug 8 fix: vary noise scale per layer so layers have distinct feature sizes
      // even when depthSpread is small. Front layers (0) are finer, back layers are coarser.
      const layerT = p.layerCount > 1 ? layer / (p.layerCount - 1) : 0.5;
      const effectiveNoiseScale = p.noiseScale * (0.85 + layerT * 0.3);

      // driftY: per-layer vertical offset in noise space (front layers drift more = parallax)
      const driftYOffset = p.driftY * (1 - layerT * 0.5) * 1.5;

      for (let ry = 0; ry < rh; ry++) {
        const normalizedY = ry / rh;

        // Smoothstep edge falloff
        let edgeAlpha = 1;
        if (normalizedY < p.edgeSoftness) {
          const t = normalizedY / p.edgeSoftness;
          edgeAlpha = t * t * (3 - 2 * t);
        } else if (normalizedY > 1 - p.edgeSoftness) {
          const t = (1 - normalizedY) / p.edgeSoftness;
          edgeAlpha = t * t * (3 - 2 * t);
        }

        // Vertical color gradient (colorBottom blends in toward band bottom)
        const gr = Math.round(topR + (botR - topR) * normalizedY);
        const gg = Math.round(topG + (botG - topG) * normalizedY);
        const gb = Math.round(topB + (botB - topB) * normalizedY);

        for (let rx = 0; rx < rw; rx++) {
          const normalizedX = rx / rw;

          const nx = (normalizedX + p.driftX * Math.sin(p.driftPhase + layer) + layerOffset) * effectiveNoiseScale;
          const ny = (normalizedY + driftYOffset) * effectiveNoiseScale + layer * 5;

          const n = noise(nx, ny);

          if (n > threshold) {
            const aboveThreshold = (n - threshold) / (1 - threshold);
            const alpha = Math.min(1, aboveThreshold * 2) * edgeAlpha * layerOpacity;

            if (alpha > 0.01) {
              const idx = (ry * rw + rx) * 4;
              const existingA = data[idx + 3]! / 255;
              const newA = alpha * (1 - existingA);
              const totalA = existingA + newA;

              if (totalA > 0) {
                data[idx] = Math.round((data[idx]! * existingA + gr * newA) / totalA);
                data[idx + 1] = Math.round((data[idx + 1]! * existingA + gg * newA) / totalA);
                data[idx + 2] = Math.round((data[idx + 2]! * existingA + gb * newA) / totalA);
                data[idx + 3] = Math.round(totalA * 255);
              }
            }
          }
        }
      }
    }

    // Scale 1/4-res imageData up to full band size via nearest-neighbor — no OffscreenCanvas needed
    const fullImageData = ctx.createImageData(width, bandHeight);
    const fullData = fullImageData.data;
    for (let fy = 0; fy < bandHeight; fy++) {
      const ry = Math.min(Math.floor((fy / bandHeight) * rh), rh - 1);
      for (let fx = 0; fx < width; fx++) {
        const rx = Math.min(Math.floor((fx / width) * rw), rw - 1);
        const src = (ry * rw + rx) * 4;
        const dst = (fy * width + fx) * 4;
        fullData[dst] = data[src]!;
        fullData[dst + 1] = data[src + 1]!;
        fullData[dst + 2] = data[src + 2]!;
        fullData[dst + 3] = data[src + 3]!;
      }
    }
    ctx.putImageData(fullImageData, bx, bandTopPx);
  },

  validate(properties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const presetId = properties.preset as string;
    if (presetId && !getPreset(presetId)) {
      errors.push({ property: "preset", message: `Unknown mist preset "${presetId}"` });
    }
    return errors.length > 0 ? errors : null;
  },
};
