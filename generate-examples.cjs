#!/usr/bin/env node
/**
 * Generate .genart example files for all 15 particle presets + 6 atmosphere recipes.
 * Usage: node generate-examples.cjs
 */
const fs = require("fs");
const path = require("path");

const examplesDir = path.join(__dirname, "examples");
const NOW = "2026-03-11T00:00:00.000Z";

// --- Background colors per category ---
const CATEGORY_BG = {
  falling: "#0a1628",
  floating: "#0d1117",
  scatter: "#1a1a14",
  mist: "#0e1218",
};

// --- All 15 presets with their full layer properties ---
const PRESETS = [
  // ======== FALLING (4) ========
  {
    id: "snow",
    name: "Snow",
    category: "falling",
    layerType: "particles:falling",
    bg: "#0a1628",
    properties: {
      preset: "snow",
      seed: 2749,
      particleType: "snowflake",
      count: 200,
      sizeMin: 2,
      sizeMax: 8,
      color: "#FFFFFF",
      colorVariation: 0.05,
      opacity: 0.8,
      windAngle: 15,
      windStrength: 0.3,
      fallProgress: 0.7,
      depthDistribution: "uniform",
      depthEasing: "linear",
      horizonY: 0.3,
    },
  },
  {
    id: "rain",
    name: "Rain",
    category: "falling",
    layerType: "particles:falling",
    bg: "#0c1520",
    properties: {
      preset: "rain",
      seed: 8317,
      particleType: "raindrop",
      count: 400,
      sizeMin: 3,
      sizeMax: 10,
      color: "#B0C4DE",
      colorVariation: 0.1,
      opacity: 0.5,
      windAngle: 5,
      windStrength: 0.1,
      fallProgress: 1.0,
      depthDistribution: "uniform",
      depthEasing: "quadratic",
      horizonY: 0.25,
    },
  },
  {
    id: "autumn-leaves",
    name: "Autumn Leaves",
    category: "falling",
    layerType: "particles:falling",
    bg: "#1a1008",
    properties: {
      preset: "autumn-leaves",
      seed: 5164,
      particleType: "leaf",
      count: 60,
      sizeMin: 6,
      sizeMax: 18,
      color: "#C8652A",
      colorVariation: 0.3,
      opacity: 0.9,
      windAngle: 25,
      windStrength: 0.5,
      fallProgress: 0.5,
      depthDistribution: "foreground-heavy",
      depthEasing: "linear",
      horizonY: 0.3,
    },
  },
  {
    id: "petals",
    name: "Petals",
    category: "falling",
    layerType: "particles:falling",
    bg: "#1a0f14",
    properties: {
      preset: "petals",
      seed: 3571,
      particleType: "petal",
      count: 80,
      sizeMin: 4,
      sizeMax: 12,
      color: "#FFB7C5",
      colorVariation: 0.15,
      opacity: 0.85,
      windAngle: 30,
      windStrength: 0.4,
      fallProgress: 0.4,
      depthDistribution: "uniform",
      depthEasing: "linear",
      horizonY: 0.35,
    },
  },

  // ======== FLOATING (4) ========
  {
    id: "dust-motes",
    name: "Dust Motes",
    category: "floating",
    layerType: "particles:floating",
    bg: "#1a1610",
    properties: {
      preset: "dust-motes",
      seed: 4219,
      particleType: "dot",
      count: 100,
      sizeMin: 1,
      sizeMax: 3,
      color: "#F5DEB3",
      opacity: 0.4,
      glow: false,
      glowColor: "#FFFFFF",
      driftRange: 5,
      driftPhase: 0,
      depthBandMin: 0.2,
      depthBandMax: 0.8,
      depthEasing: "linear",
      horizonY: 0.4,
    },
  },
  {
    id: "fireflies",
    name: "Fireflies",
    category: "floating",
    layerType: "particles:floating",
    bg: "#050a05",
    properties: {
      preset: "fireflies",
      seed: 7331,
      particleType: "firefly",
      count: 30,
      sizeMin: 3,
      sizeMax: 8,
      color: "#FFDD44",
      opacity: 0.9,
      glow: true,
      glowColor: "#FFEE88",
      driftRange: 15,
      driftPhase: 0,
      depthBandMin: 0.3,
      depthBandMax: 0.9,
      depthEasing: "linear",
      horizonY: 0.3,
    },
  },
  {
    id: "fog-wisps",
    name: "Fog Wisps",
    category: "floating",
    layerType: "particles:floating",
    bg: "#101418",
    properties: {
      preset: "fog-wisps",
      seed: 6173,
      particleType: "wisp",
      count: 40,
      sizeMin: 8,
      sizeMax: 25,
      color: "#D0D8E0",
      opacity: 0.25,
      glow: false,
      glowColor: "#FFFFFF",
      driftRange: 20,
      driftPhase: 0,
      depthBandMin: 0.3,
      depthBandMax: 0.7,
      depthEasing: "quadratic",
      horizonY: 0.35,
    },
  },
  {
    id: "pollen",
    name: "Pollen",
    category: "floating",
    layerType: "particles:floating",
    bg: "#141a0e",
    properties: {
      preset: "pollen",
      seed: 9421,
      particleType: "pollen",
      count: 60,
      sizeMin: 2,
      sizeMax: 5,
      color: "#E8D44D",
      opacity: 0.5,
      glow: false,
      glowColor: "#FFFFFF",
      driftRange: 8,
      driftPhase: 0,
      depthBandMin: 0.1,
      depthBandMax: 0.6,
      depthEasing: "linear",
      horizonY: 0.35,
    },
  },

  // ======== SCATTER (3) ========
  {
    id: "fallen-leaves",
    name: "Fallen Leaves",
    category: "scatter",
    layerType: "particles:scatter",
    bg: "#1a1408",
    properties: {
      preset: "fallen-leaves",
      seed: 1729,
      elementType: "leaf",
      count: 80,
      sizeMin: 8,
      sizeMax: 22,
      color: "#B8652A",
      colorVariation: 0.35,
      rotationRange: 6.28,
      distribution: "clustered",
      clusterStrength: 0.4,
      groundY: 0.7,
      horizonY: 0.35,
      depthEasing: "quadratic",
    },
  },
  {
    id: "pebbles",
    name: "Pebbles",
    category: "scatter",
    layerType: "particles:scatter",
    bg: "#18181a",
    properties: {
      preset: "pebbles",
      seed: 2851,
      elementType: "stone",
      count: 60,
      sizeMin: 3,
      sizeMax: 12,
      color: "#8A8A80",
      colorVariation: 0.2,
      rotationRange: 6.28,
      distribution: "uniform",
      clusterStrength: 0,
      groundY: 0.75,
      horizonY: 0.35,
      depthEasing: "quadratic",
    },
  },
  {
    id: "wildflowers",
    name: "Wildflowers",
    category: "scatter",
    layerType: "particles:scatter",
    bg: "#0f1a0a",
    properties: {
      preset: "wildflowers",
      seed: 4637,
      elementType: "flower",
      count: 50,
      sizeMin: 5,
      sizeMax: 15,
      color: "#E05090",
      colorVariation: 0.4,
      rotationRange: 1.57,
      distribution: "center-weighted",
      clusterStrength: 0,
      groundY: 0.65,
      horizonY: 0.3,
      depthEasing: "quadratic",
    },
  },

  // ======== MIST (4) ========
  {
    id: "morning-mist",
    name: "Morning Mist",
    category: "mist",
    layerType: "particles:mist",
    bg: "#0e1218",
    properties: {
      preset: "morning-mist",
      seed: 3142,
      density: 0.4,
      color: "#E8E8F0",
      opacity: 0.35,
      bandTop: 0.5,
      bandBottom: 0.8,
      edgeSoftness: 0.3,
      noiseScale: 3.0,
      noiseOctaves: 3,
      driftX: 0.1,
      driftPhase: 0,
      layerCount: 3,
      depthSpread: 0.2,
    },
  },
  {
    id: "valley-fog",
    name: "Valley Fog",
    category: "mist",
    layerType: "particles:mist",
    bg: "#0c1018",
    properties: {
      preset: "valley-fog",
      seed: 5927,
      density: 0.7,
      color: "#D0D0D8",
      opacity: 0.5,
      bandTop: 0.4,
      bandBottom: 0.9,
      edgeSoftness: 0.2,
      noiseScale: 2.5,
      noiseOctaves: 4,
      driftX: 0.05,
      driftPhase: 0,
      layerCount: 5,
      depthSpread: 0.3,
    },
  },
  {
    id: "mountain-haze",
    name: "Mountain Haze",
    category: "mist",
    layerType: "particles:mist",
    bg: "#0a1020",
    properties: {
      preset: "mountain-haze",
      seed: 7841,
      density: 0.25,
      color: "#C8D0E0",
      opacity: 0.2,
      bandTop: 0.2,
      bandBottom: 0.7,
      edgeSoftness: 0.4,
      noiseScale: 4.0,
      noiseOctaves: 2,
      driftX: 0.15,
      driftPhase: 0,
      layerCount: 2,
      depthSpread: 0.15,
    },
  },
  {
    id: "ground-steam",
    name: "Ground Steam",
    category: "mist",
    layerType: "particles:mist",
    bg: "#121414",
    properties: {
      preset: "ground-steam",
      seed: 6553,
      density: 0.5,
      color: "#F0F0F0",
      opacity: 0.3,
      bandTop: 0.65,
      bandBottom: 0.95,
      edgeSoftness: 0.15,
      noiseScale: 5.0,
      noiseOctaves: 3,
      driftX: 0.02,
      driftPhase: 0,
      layerCount: 4,
      depthSpread: 0.1,
    },
  },
];

// --- Atmosphere recipes (multi-layer) ---
const ATMOSPHERE_RECIPES = [
  {
    id: "winter-storm",
    name: "Winter Storm",
    bg: "#0a1628",
    layers: [
      { presetId: "snow", seed: 2749 },
      { presetId: "fog-wisps", seed: 10668 },
      { presetId: "mountain-haze", seed: 18587 },
    ],
  },
  {
    id: "autumn-forest",
    name: "Autumn Forest",
    bg: "#1a1008",
    layers: [
      { presetId: "autumn-leaves", seed: 5164 },
      { presetId: "fallen-leaves", seed: 13083 },
      { presetId: "morning-mist", seed: 21002 },
    ],
  },
  {
    id: "misty-morning",
    name: "Misty Morning",
    bg: "#101820",
    layers: [
      { presetId: "morning-mist", seed: 3142 },
      { presetId: "dust-motes", seed: 11061 },
    ],
  },
  {
    id: "firefly-night",
    name: "Firefly Night",
    bg: "#050a05",
    layers: [
      { presetId: "fireflies", seed: 7331 },
      { presetId: "fog-wisps", seed: 15250 },
    ],
  },
  {
    id: "spring-meadow",
    name: "Spring Meadow",
    bg: "#0f1a0a",
    layers: [
      { presetId: "petals", seed: 3571 },
      { presetId: "pollen", seed: 11490 },
      { presetId: "wildflowers", seed: 19409 },
    ],
  },
  {
    id: "dusty-ruins",
    name: "Dusty Ruins",
    bg: "#18181a",
    layers: [
      { presetId: "dust-motes", seed: 4219 },
      { presetId: "pebbles", seed: 12138 },
      { presetId: "ground-steam", seed: 20057 },
    ],
  },
];

// --- Helpers ---

function makeLayer(id, layerType, name, properties, width, height) {
  return {
    id,
    type: layerType,
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: {
      x: 0, y: 0, width, height,
      rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0,
    },
    properties,
  };
}

function makeBgLayer(color, width, height) {
  return makeLayer("bg-layer", "composite:solid", "Background", { color }, width, height);
}

function makeSketch(id, title, width, height, layers) {
  return {
    genart: "1.3",
    id,
    title,
    created: NOW,
    modified: NOW,
    renderer: { type: "canvas2d" },
    canvas: { width, height },
    parameters: [],
    colors: [],
    state: { seed: 42, params: {}, colorPalette: [] },
    algorithm: "function sketch(ctx, state) {}",
    layers,
  };
}

function findPreset(presetId) {
  return PRESETS.find((p) => p.id === presetId);
}

// --- Generate individual preset examples ---

let totalFiles = 0;

for (const preset of PRESETS) {
  const dir = path.join(examplesDir, preset.category);
  const filePath = path.join(dir, `${preset.id}.genart`);

  const W = 600, H = 600;
  const layers = [
    makeBgLayer(preset.bg, W, H),
    makeLayer("particle-layer", preset.layerType, preset.name, preset.properties, W, H),
  ];
  const sketch = makeSketch(`particles-${preset.id}`, `${preset.name} Particles`, W, H, layers);

  fs.writeFileSync(filePath, JSON.stringify(sketch, null, 2) + "\n");
  totalFiles++;
}

// --- Generate atmosphere recipe examples ---

for (const recipe of ATMOSPHERE_RECIPES) {
  const dir = path.join(examplesDir, "atmosphere");
  const filePath = path.join(dir, `${recipe.id}.genart`);

  const W = 600, H = 600;
  const layers = [makeBgLayer(recipe.bg, W, H)];

  for (let i = 0; i < recipe.layers.length; i++) {
    const layerDef = recipe.layers[i];
    const preset = findPreset(layerDef.presetId);
    if (!preset) {
      console.error(`  ERROR: preset "${layerDef.presetId}" not found for recipe "${recipe.id}"`);
      continue;
    }
    const props = { ...preset.properties, seed: layerDef.seed };
    layers.push(
      makeLayer(
        `layer-${i}`,
        preset.layerType,
        `${preset.name}`,
        props,
        W,
        H,
      ),
    );
  }

  const sketch = makeSketch(`atmosphere-${recipe.id}`, `${recipe.name} (Atmosphere)`, W, H, layers);

  fs.writeFileSync(filePath, JSON.stringify(sketch, null, 2) + "\n");
  totalFiles++;
}

console.log(`Generated ${totalFiles} .genart example files.`);
