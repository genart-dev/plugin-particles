/**
 * @genart-dev/plugin-particles — Depth-aware atmospheric particle layers
 *
 * 5 layer types (falling, floating, scatter, mist, trailing),
 * 34 presets, 9 MCP tools.
 */

import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { particlesMcpTools } from "./particles-tools.js";
import {
  fallingLayerType,
  floatingLayerType,
  scatterLayerType,
  mistLayerType,
  trailingLayerType,
} from "./layers/index.js";

const particlesPlugin: DesignPlugin = {
  id: "particles",
  name: "Particles",
  version: "0.2.0",
  description:
    "Depth-aware atmospheric particle layers: falling (snow, rain, leaves, embers, confetti), floating (dust, fireflies, butterflies, bubbles), " +
    "scatter (ground elements, shells, acorns), mist (fog bands, steam, smoke), and trailing (meteors, speed rain, shooting stars, light trails). " +
    "5 layer types, 34 presets, 9 MCP tools.",

  layerTypes: [
    fallingLayerType,
    floatingLayerType,
    scatterLayerType,
    mistLayerType,
    trailingLayerType,
  ],
  tools: [],
  exportHandlers: [],
  mcpTools: particlesMcpTools,

  async initialize(_context: PluginContext): Promise<void> {},
  dispose(): void {},
};

export default particlesPlugin;

// Re-export layer types
export {
  fallingLayerType,
  floatingLayerType,
  scatterLayerType,
  mistLayerType,
  trailingLayerType,
} from "./layers/index.js";

// Re-export presets
export { ALL_PRESETS, getPreset, filterPresets, searchPresets, categoryToLayerType } from "./presets/index.js";
export type {
  ParticlePreset,
  FallingPreset,
  FloatingPreset,
  ScatterPreset,
  MistPreset,
  TrailingPreset,
  PresetCategory,
} from "./presets/types.js";

// Re-export tools
export { particlesMcpTools } from "./particles-tools.js";

// Re-export shared utilities
export { mulberry32 } from "./shared/prng.js";
export { createValueNoise, createFractalNoise } from "./shared/noise.js";
export { parseHex, toHex, lerpColor, varyColor } from "./shared/color-utils.js";
export { applyDepthEasing, computeDepth, applyDepthToParticle, sampleDepthDistribution } from "./shared/depth.js";
export type { DepthEasing, DepthDistribution, DepthConfig } from "./shared/depth.js";
export {
  resolveDepthLane, depthForLane, laneSubLevelAttenuation, applyAtmosphericDepth,
  createDepthLaneProperty, createAtmosphericModeProperty, DEPTH_LANE_OPTIONS, DEPTH_LANE_ORDER,
} from "./shared/depth-lanes.js";
export type { DepthLane, DepthSubLevel, DepthLaneSub, DepthLaneConfig, AtmosphericMode, SubLevelAttenuation } from "./shared/depth-lanes.js";
export {
  drawCircle, drawSnowflake, drawRaindrop, drawLeaf, drawPetal, drawAsh, drawDust,
  drawEmber, drawNeedle,
  drawDot, drawWisp, drawFirefly, drawPollen, drawSparkle,
  drawButterfly, drawBubble, drawSeedTuft,
  drawStone, drawFlower, drawDebris, drawAcorn, drawShell,
  getFallingShape, getFloatingShape, getScatterShape,
} from "./shared/shapes.js";
