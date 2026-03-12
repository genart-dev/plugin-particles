/**
 * MCP tool definitions for plugin-particles.
 *
 * 9 tools: add_particles, list_particle_presets, set_particle_depth,
 * set_particle_motion, set_particle_style, set_depth_lane,
 * create_atmosphere, randomize_particles, set_mist_band.
 */

import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  DesignLayer,
  LayerTransform,
  LayerProperties,
} from "@genart-dev/core";
import { ALL_PRESETS, getPreset, filterPresets, categoryToLayerType } from "./presets/index.js";
import type { PresetCategory, ParticlePreset } from "./presets/types.js";
import { mulberry32 } from "./shared/prng.js";
import { DEPTH_LANE_OPTIONS } from "./shared/depth-lanes.js";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fullCanvasTransform(ctx: McpToolContext): LayerTransform {
  return {
    x: 0,
    y: 0,
    width: ctx.canvasWidth,
    height: ctx.canvasHeight,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0,
    anchorY: 0,
  };
}

function createLayer(
  typeId: string,
  name: string,
  ctx: McpToolContext,
  properties: Record<string, unknown>,
): DesignLayer {
  return {
    id: generateLayerId(),
    type: typeId,
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: fullCanvasTransform(ctx),
    properties: properties as Record<string, string | number | boolean | null>,
  };
}

/** Build properties for a layer from a preset, merging any user overrides. */
function presetToProperties(
  preset: ParticlePreset,
  seed: number,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const props: Record<string, unknown> = { preset: preset.id, seed };

  // Copy all preset-specific properties
  if (preset.category === "falling") {
    props.particleType = preset.particleType;
    props.count = preset.count;
    props.sizeMin = preset.sizeMin;
    props.sizeMax = preset.sizeMax;
    props.color = preset.color;
    props.colorVariation = preset.colorVariation;
    props.opacity = preset.opacity;
    props.windAngle = preset.windAngle;
    props.windStrength = preset.windStrength;
    props.fallProgress = preset.fallProgress;
    props.depthDistribution = preset.depthDistribution;
    props.depthEasing = preset.depthEasing;
    props.horizonY = preset.horizonY;
  } else if (preset.category === "floating") {
    props.particleType = preset.particleType;
    props.count = preset.count;
    props.sizeMin = preset.sizeMin;
    props.sizeMax = preset.sizeMax;
    props.color = preset.color;
    props.opacity = preset.opacity;
    props.glow = preset.glow;
    props.glowColor = preset.glowColor;
    props.driftRange = preset.driftRange;
    props.driftPhase = preset.driftPhase;
    props.depthBandMin = preset.depthBandMin;
    props.depthBandMax = preset.depthBandMax;
    props.depthEasing = preset.depthEasing;
    props.horizonY = preset.horizonY;
  } else if (preset.category === "scatter") {
    props.elementType = preset.elementType;
    props.count = preset.count;
    props.sizeMin = preset.sizeMin;
    props.sizeMax = preset.sizeMax;
    props.color = preset.color;
    props.colorVariation = preset.colorVariation;
    props.rotationRange = preset.rotationRange;
    props.distribution = preset.distribution;
    props.clusterStrength = preset.clusterStrength;
    props.groundY = preset.groundY;
    props.horizonY = preset.horizonY;
    props.depthEasing = preset.depthEasing;
  } else if (preset.category === "mist") {
    props.density = preset.density;
    props.color = preset.color;
    props.opacity = preset.opacity;
    props.bandTop = preset.bandTop;
    props.bandBottom = preset.bandBottom;
    props.edgeSoftness = preset.edgeSoftness;
    props.noiseScale = preset.noiseScale;
    props.noiseOctaves = preset.noiseOctaves;
    props.driftX = preset.driftX;
    props.driftPhase = preset.driftPhase;
    props.layerCount = preset.layerCount;
    props.depthSpread = preset.depthSpread;
  }

  // Apply user overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      props[key] = value;
    }
  }

  return props;
}

// ---------------------------------------------------------------------------
// add_particles
// ---------------------------------------------------------------------------

const addParticlesTool: McpToolDefinition = {
  name: "add_particles",
  description:
    "Add a particle layer by preset name. Auto-resolves to the correct layer type (falling, floating, scatter, mist) " +
    "from the preset category. 29 presets available across all categories.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: [
          "snow", "rain", "autumn-leaves", "petals", "embers", "ash-fall",
          "cherry-blossoms", "confetti", "pine-needles",
          "dust-motes", "fireflies", "fog-wisps", "pollen",
          "dandelion-seeds", "butterflies", "bubbles", "sparkles",
          "fallen-leaves", "pebbles", "wildflowers", "shells", "acorns", "sea-foam",
          "morning-mist", "valley-fog", "mountain-haze", "ground-steam",
          "ground-steam-thick", "smoke-wisps",
        ],
        description: "Particle preset name.",
      },
      seed: { type: "number", description: "Random seed for particle variation." },
      color: { type: "string", description: "Override particle color as hex." },
      count: { type: "number", description: "Override particle count." },
      opacity: { type: "number", description: "Override opacity 0-1." },
      depthLane: {
        type: "string",
        enum: DEPTH_LANE_OPTIONS.map((o) => o.value),
        description: "Depth lane for scene integration (e.g. sky-1, midground-2, foreground-3).",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode: western (blue shift), ink-wash (paper tone), none.",
      },
      name: { type: "string", description: "Custom layer name." },
    },
    required: ["preset"],
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const presetId = input.preset as string;
    const preset = getPreset(presetId);
    if (!preset) {
      return errorResult(`Unknown particle preset "${presetId}". Use list_particle_presets to see options.`);
    }

    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const overrides: Record<string, unknown> = {};
    if (input.color) overrides.color = input.color;
    if (input.count !== undefined) overrides.count = input.count;
    if (input.opacity !== undefined) overrides.opacity = input.opacity;
    if (input.depthLane) overrides.depthLane = input.depthLane;
    if (input.atmosphericMode) overrides.atmosphericMode = input.atmosphericMode;

    const properties = presetToProperties(preset, seed, overrides);
    const layerType = categoryToLayerType(preset.category);
    const layerName = (input.name as string) ?? `${preset.name} (${preset.category})`;
    const layer = createLayer(layerType, layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added ${preset.category} particle layer "${layerName}" with ${presetId} preset.\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// list_particle_presets
// ---------------------------------------------------------------------------

const listParticlePresetsTool: McpToolDefinition = {
  name: "list_particle_presets",
  description:
    `List all ${ALL_PRESETS.length} particle presets, optionally filtered by category (falling, floating, scatter, mist).`,
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["falling", "floating", "scatter", "mist"],
        description: "Filter by category.",
      },
    },
  },
  async handler(input: Record<string, unknown>): Promise<McpToolResult> {
    const results = input.category
      ? filterPresets({ category: input.category as PresetCategory })
      : ALL_PRESETS;

    if (results.length === 0) {
      return textResult("No presets match the given filter.");
    }

    const lines = results.map((p) =>
      `  ${p.id} — ${p.name} [${p.category}] ${p.description}`,
    );

    return textResult(
      `${results.length} preset${results.length === 1 ? "" : "s"}:\n${lines.join("\n")}`,
    );
  },
};

// ---------------------------------------------------------------------------
// set_particle_depth
// ---------------------------------------------------------------------------

const setParticleDepthTool: McpToolDefinition = {
  name: "set_particle_depth",
  description:
    "Configure depth properties on a particle layer: horizonY, depthEasing, depthDistribution, depthBandMin/Max.",
  inputSchema: {
    type: "object",
    required: ["layerId"],
    properties: {
      layerId: { type: "string", description: "Target particle layer ID." },
      horizonY: { type: "number", description: "Horizon line position 0-1." },
      depthEasing: {
        type: "string",
        enum: ["linear", "quadratic", "cubic", "exponential"],
        description: "Depth easing curve.",
      },
      depthDistribution: {
        type: "string",
        enum: ["uniform", "foreground-heavy", "background-heavy", "midground"],
        description: "Depth distribution (falling layers only).",
      },
      depthBandMin: { type: "number", description: "Depth band min (floating layers only)." },
      depthBandMax: { type: "number", description: "Depth band max (floating layers only)." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (!layer.type.startsWith("particles:")) {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not a particles layer.`);
    }

    const changes: string[] = [];
    const propUpdates: Partial<LayerProperties> = {};

    if (input.horizonY !== undefined) {
      propUpdates.horizonY = input.horizonY as number;
      changes.push(`horizonY → ${input.horizonY}`);
    }
    if (input.depthEasing !== undefined) {
      propUpdates.depthEasing = input.depthEasing as string;
      changes.push(`depthEasing → ${input.depthEasing}`);
    }
    if (input.depthDistribution !== undefined) {
      propUpdates.depthDistribution = input.depthDistribution as string;
      changes.push(`depthDistribution → ${input.depthDistribution}`);
    }
    if (input.depthBandMin !== undefined) {
      propUpdates.depthBandMin = input.depthBandMin as number;
      changes.push(`depthBandMin → ${input.depthBandMin}`);
    }
    if (input.depthBandMax !== undefined) {
      propUpdates.depthBandMax = input.depthBandMax as number;
      changes.push(`depthBandMax → ${input.depthBandMax}`);
    }

    if (changes.length === 0) return errorResult("No depth changes specified.");

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated depth on "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// set_particle_motion
// ---------------------------------------------------------------------------

const setParticleMotionTool: McpToolDefinition = {
  name: "set_particle_motion",
  description:
    "Configure motion properties on a particle layer: windAngle, windStrength, fallProgress, driftRange, driftPhase, driftX.",
  inputSchema: {
    type: "object",
    required: ["layerId"],
    properties: {
      layerId: { type: "string", description: "Target particle layer ID." },
      windAngle: { type: "number", description: "Wind angle in degrees (-90 to 90). Falling layers." },
      windStrength: { type: "number", description: "Wind strength 0-1. Falling layers." },
      fallProgress: { type: "number", description: "Fall progress 0-1. Falling layers." },
      driftRange: { type: "number", description: "Drift range in pixels. Floating layers." },
      driftPhase: { type: "number", description: "Drift phase 0-2π. Floating layers." },
      driftX: { type: "number", description: "Horizontal drift. Mist layers." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (!layer.type.startsWith("particles:")) {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not a particles layer.`);
    }

    const changes: string[] = [];
    const propUpdates: Partial<LayerProperties> = {};

    for (const key of ["windAngle", "windStrength", "fallProgress", "driftRange", "driftPhase", "driftX"]) {
      if (input[key] !== undefined) {
        propUpdates[key] = input[key] as number;
        changes.push(`${key} → ${input[key]}`);
      }
    }

    if (changes.length === 0) return errorResult("No motion changes specified.");

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated motion on "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// set_particle_style
// ---------------------------------------------------------------------------

const setParticleStyleTool: McpToolDefinition = {
  name: "set_particle_style",
  description:
    "Configure visual style on a particle layer: color, colorVariation, opacity, glow, glowColor, sizeMin, sizeMax.",
  inputSchema: {
    type: "object",
    required: ["layerId"],
    properties: {
      layerId: { type: "string", description: "Target particle layer ID." },
      color: { type: "string", description: "Particle color as hex." },
      colorVariation: { type: "number", description: "Color variation 0-1." },
      opacity: { type: "number", description: "Opacity 0-1." },
      glow: { type: "boolean", description: "Enable glow effect (floating only)." },
      glowColor: { type: "string", description: "Glow color as hex (floating only)." },
      sizeMin: { type: "number", description: "Minimum particle size." },
      sizeMax: { type: "number", description: "Maximum particle size." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (!layer.type.startsWith("particles:")) {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not a particles layer.`);
    }

    const changes: string[] = [];
    const propUpdates: Partial<LayerProperties> = {};

    for (const key of ["color", "colorVariation", "opacity", "glow", "glowColor", "sizeMin", "sizeMax"]) {
      if (input[key] !== undefined) {
        propUpdates[key] = input[key] as string | number | boolean;
        changes.push(`${key} → ${input[key]}`);
      }
    }

    if (changes.length === 0) return errorResult("No style changes specified.");

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated style on "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// set_depth_lane
// ---------------------------------------------------------------------------

const setDepthLaneTool: McpToolDefinition = {
  name: "set_depth_lane",
  description:
    "Set depth lane and atmospheric mode on a particle layer for cross-plugin depth coordination. " +
    "Depth lanes: sky, far-background, background, midground, foreground, ground-plane, overlay (each with optional -1/-2/-3 sub-level). " +
    "Atmospheric modes: western (blue shift + desaturation), ink-wash (warm paper tone), none.",
  inputSchema: {
    type: "object",
    required: ["layerId"],
    properties: {
      layerId: { type: "string", description: "Target particle layer ID." },
      depthLane: {
        type: "string",
        enum: DEPTH_LANE_OPTIONS.map((o) => o.value),
        description: "Depth lane (e.g. background-2, foreground-1, ground-plane).",
      },
      atmosphericMode: {
        type: "string",
        enum: ["none", "western", "ink-wash"],
        description: "Atmospheric depth mode.",
      },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (!layer.type.startsWith("particles:")) {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not a particles layer.`);
    }

    const changes: string[] = [];
    const propUpdates: Partial<LayerProperties> = {};

    if (input.depthLane !== undefined) {
      propUpdates.depthLane = input.depthLane as string;
      changes.push(`depthLane → ${input.depthLane}`);
    }
    if (input.atmosphericMode !== undefined) {
      propUpdates.atmosphericMode = input.atmosphericMode as string;
      changes.push(`atmosphericMode → ${input.atmosphericMode}`);
    }

    if (changes.length === 0) return errorResult("No depth lane changes specified.");

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated depth lane on "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// create_atmosphere
// ---------------------------------------------------------------------------

interface AtmosphereRecipe {
  name: string;
  layers: Array<{ presetId: string; seedOffset: number }>;
}

const ATMOSPHERE_RECIPES: Record<string, AtmosphereRecipe> = {
  "winter-storm": {
    name: "Winter Storm",
    layers: [
      { presetId: "snow", seedOffset: 0 },
      { presetId: "fog-wisps", seedOffset: 1 },
      { presetId: "mountain-haze", seedOffset: 2 },
    ],
  },
  "autumn-forest": {
    name: "Autumn Forest",
    layers: [
      { presetId: "autumn-leaves", seedOffset: 0 },
      { presetId: "fallen-leaves", seedOffset: 1 },
      { presetId: "morning-mist", seedOffset: 2 },
    ],
  },
  "misty-morning": {
    name: "Misty Morning",
    layers: [
      { presetId: "morning-mist", seedOffset: 0 },
      { presetId: "dust-motes", seedOffset: 1 },
    ],
  },
  "firefly-night": {
    name: "Firefly Night",
    layers: [
      { presetId: "fireflies", seedOffset: 0 },
      { presetId: "fog-wisps", seedOffset: 1 },
    ],
  },
  "spring-meadow": {
    name: "Spring Meadow",
    layers: [
      { presetId: "petals", seedOffset: 0 },
      { presetId: "pollen", seedOffset: 1 },
      { presetId: "wildflowers", seedOffset: 2 },
    ],
  },
  "dusty-ruins": {
    name: "Dusty Ruins",
    layers: [
      { presetId: "dust-motes", seedOffset: 0 },
      { presetId: "pebbles", seedOffset: 1 },
      { presetId: "ground-steam", seedOffset: 2 },
    ],
  },
};

const createAtmosphereTool: McpToolDefinition = {
  name: "create_atmosphere",
  description:
    "Create a multi-layer atmospheric scene from a named recipe. Recipes: winter-storm (snow + fog + haze), " +
    "autumn-forest (leaves falling + ground + mist), misty-morning (mist + dust), firefly-night (fireflies + fog), " +
    "spring-meadow (petals + pollen + wildflowers), dusty-ruins (dust + pebbles + steam).",
  inputSchema: {
    type: "object",
    required: ["recipe"],
    properties: {
      recipe: {
        type: "string",
        enum: Object.keys(ATMOSPHERE_RECIPES),
        description: "Atmosphere recipe name.",
      },
      seed: { type: "number", description: "Base seed for all layers." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const recipeName = input.recipe as string;
    const recipe = ATMOSPHERE_RECIPES[recipeName];
    if (!recipe) {
      return errorResult(`Unknown atmosphere recipe "${recipeName}". Options: ${Object.keys(ATMOSPHERE_RECIPES).join(", ")}.`);
    }

    const baseSeed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const layerIds: string[] = [];
    const summary: string[] = [];

    for (const { presetId, seedOffset } of recipe.layers) {
      const preset = getPreset(presetId);
      if (!preset) continue;

      const seed = baseSeed + seedOffset * 7919;
      const properties = presetToProperties(preset, seed, {});
      const layerType = categoryToLayerType(preset.category);
      const layerName = `${preset.name} (${preset.category})`;
      const layer = createLayer(layerType, layerName, ctx, properties);

      ctx.layers.add(layer);
      layerIds.push(layer.id);
      summary.push(`${preset.name}: ${presetId} (seed ${seed})`);
    }

    ctx.emitChange("layer-added");

    return textResult(
      `Atmosphere "${recipe.name}" created (${layerIds.length} layers):\n` +
      summary.map((s) => `  ${s}`).join("\n") +
      `\nLayer IDs: ${layerIds.join(", ")}`,
    );
  },
};

// ---------------------------------------------------------------------------
// randomize_particles
// ---------------------------------------------------------------------------

const randomizeParticlesTool: McpToolDefinition = {
  name: "randomize_particles",
  description:
    "Add a random particle layer, optionally constrained by category (falling, floating, scatter, mist).",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["falling", "floating", "scatter", "mist"],
        description: "Constrain to this category. Omit for any.",
      },
      seed: { type: "number", description: "Random seed." },
      name: { type: "string", description: "Custom layer name." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const seed = (input.seed as number) ?? Math.floor(Math.random() * 100000);
    const rng = mulberry32(seed);

    const candidates = input.category
      ? filterPresets({ category: input.category as PresetCategory })
      : ALL_PRESETS;

    if (candidates.length === 0) {
      return errorResult("No presets available for the given category.");
    }

    const preset = candidates[Math.floor(rng() * candidates.length)]!;
    const properties = presetToProperties(preset, seed, {});
    const layerType = categoryToLayerType(preset.category);
    const layerName = (input.name as string) ?? `Random: ${preset.name}`;
    const layer = createLayer(layerType, layerName, ctx, properties);

    ctx.layers.add(layer);
    ctx.emitChange("layer-added");

    return textResult(
      `Added random ${preset.category} layer "${layerName}" (preset: ${preset.id}).\n` +
      `Seed: ${seed}, Layer ID: ${layer.id}`,
    );
  },
};

// ---------------------------------------------------------------------------
// set_mist_band
// ---------------------------------------------------------------------------

const setMistBandTool: McpToolDefinition = {
  name: "set_mist_band",
  description:
    "Configure mist band properties: bandTop, bandBottom, edgeSoftness, density, noiseScale, layerCount.",
  inputSchema: {
    type: "object",
    required: ["layerId"],
    properties: {
      layerId: { type: "string", description: "Target mist layer ID." },
      bandTop: { type: "number", description: "Band top position 0-1." },
      bandBottom: { type: "number", description: "Band bottom position 0-1." },
      edgeSoftness: { type: "number", description: "Edge softness 0-1." },
      density: { type: "number", description: "Fog density 0-1." },
      noiseScale: { type: "number", description: "Noise scale." },
      layerCount: { type: "number", description: "Number of fog sub-layers (1-8)." },
    },
  },
  async handler(input: Record<string, unknown>, ctx: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = ctx.layers.get(layerId);
    if (!layer) return errorResult(`Layer "${layerId}" not found.`);
    if (layer.type !== "particles:mist") {
      return errorResult(`Layer "${layerId}" is type "${layer.type}", not particles:mist.`);
    }

    const changes: string[] = [];
    const propUpdates: Partial<LayerProperties> = {};

    for (const key of ["bandTop", "bandBottom", "edgeSoftness", "density", "noiseScale", "layerCount"]) {
      if (input[key] !== undefined) {
        propUpdates[key] = input[key] as number;
        changes.push(`${key} → ${input[key]}`);
      }
    }

    if (changes.length === 0) return errorResult("No mist band changes specified.");

    ctx.layers.updateProperties(layerId, propUpdates);
    ctx.emitChange("layer-updated");

    return textResult(`Updated mist band on "${layer.name}":\n${changes.join("\n")}`);
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const particlesMcpTools: McpToolDefinition[] = [
  addParticlesTool,
  listParticlePresetsTool,
  setParticleDepthTool,
  setParticleMotionTool,
  setParticleStyleTool,
  setDepthLaneTool,
  createAtmosphereTool,
  randomizeParticlesTool,
  setMistBandTool,
];
