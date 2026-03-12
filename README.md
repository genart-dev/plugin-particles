# @genart-dev/plugin-particles

Depth-aware atmospheric particle layers for [genart.dev](https://genart.dev) — falling, floating, scatter, and mist effects. 15 presets across 4 categories, with 8 MCP tools for AI-agent control.

Part of [genart.dev](https://genart.dev) — a generative art platform with an MCP server, desktop app, and IDE extensions.

## Install

```bash
npm install @genart-dev/plugin-particles
```

## Usage

```typescript
import particlesPlugin from "@genart-dev/plugin-particles";
import { createDefaultRegistry } from "@genart-dev/core";

const registry = createDefaultRegistry();
registry.registerPlugin(particlesPlugin);

// Or access individual exports
import {
  ALL_PRESETS,
  getPreset,
  filterPresets,
  searchPresets,
  fallingLayerType,
  floatingLayerType,
  scatterLayerType,
  mistLayerType,
} from "@genart-dev/plugin-particles";
```

## Layer Types (4)

| Layer Type | Category | Default Preset | Description |
|---|---|---|---|
| `particles:falling` | Falling (4) | `snow` | Snow, rain, leaves, petals, ash, dust — depth-aware falling particles |
| `particles:floating` | Floating (4) | `dust-motes` | Dust motes, fireflies, fog wisps, pollen — gentle drift with glow |
| `particles:scatter` | Scatter (3) | `fallen-leaves` | Fallen leaves, stones, flowers — perspective-aware ground plane elements |
| `particles:mist` | Mist (4) | `morning-mist` | Noise-modulated fog bands rendered at 1/4 resolution for performance |

## Presets (15)

### Falling (4)

| ID | Name | Description |
|---|---|---|
| `snow` | Snow | Gentle snowfall with depth-scaled flakes drifting in light wind |
| `rain` | Rain | Streaking raindrops falling at a steep angle with subtle wind |
| `autumn-leaves` | Autumn Leaves | Warm-toned leaves tumbling through the air with varied rotation |
| `petals` | Petals | Delicate flower petals drifting slowly on a gentle breeze |

### Floating (4)

| ID | Name | Description |
|---|---|---|
| `dust-motes` | Dust Motes | Tiny dust particles catching light as they drift lazily in air |
| `fireflies` | Fireflies | Glowing fireflies with soft radial gradient halos |
| `fog-wisps` | Fog Wisps | Wispy translucent fog tendrils drifting through the scene |
| `pollen` | Pollen | Fine pollen grains floating gently in warm-toned light |

### Scatter (3)

| ID | Name | Description |
|---|---|---|
| `fallen-leaves` | Fallen Leaves | Autumn leaves scattered on the ground with natural clustering |
| `pebbles` | Pebbles | Small stones scattered across a ground plane with varied sizes |
| `wildflowers` | Wildflowers | Colorful wildflowers dotting a meadow with perspective depth |

### Mist (4)

| ID | Name | Description |
|---|---|---|
| `morning-mist` | Morning Mist | Soft low-lying mist with gentle noise modulation |
| `valley-fog` | Valley Fog | Dense fog settled into a valley with layered depth bands |
| `mountain-haze` | Mountain Haze | Atmospheric haze thinning with altitude across distant peaks |
| `ground-steam` | Ground Steam | Rising steam wisps near the ground with high edge softness |

## Shared Depth System

All particle layers share a common depth model that controls how particles recede into the scene:

- **DepthEasing** — `linear`, `quadratic`, `cubic`, `exponential` curves for size and opacity falloff
- **DepthDistribution** — `uniform`, `foreground-heavy`, `background-heavy`, `midground` control particle density placement
- **`computeDepth()`** — Returns 0..1 depth value for a particle based on its position and the horizon line
- **`applyDepthToParticle()`** — Scales size and opacity for a particle given its depth value and easing curve
- **`sampleDepthDistribution()`** — Samples a random depth value biased by the chosen distribution mode

```typescript
import {
  applyDepthEasing,
  computeDepth,
  applyDepthToParticle,
  sampleDepthDistribution,
} from "@genart-dev/plugin-particles";
```

## 16 Shape Renderers

Each particle type has a dedicated canvas2d shape renderer:

| Category | Shapes |
|---|---|
| Falling (7) | `circle`, `snowflake`, `raindrop`, `leaf`, `petal`, `ash`, `dust` |
| Floating (5) | `dot`, `wisp`, `firefly`, `pollen`, `sparkle` |
| Scatter (4) | `stone`, `flower`, `debris`, `acorn` |

```typescript
import {
  getFallingShape,
  getFloatingShape,
  getScatterShape,
  drawSnowflake,
  drawFirefly,
  drawStone,
} from "@genart-dev/plugin-particles";
```

## MCP Tools (8)

Exposed to AI agents through the MCP server when this plugin is registered:

| Tool | Description |
|---|---|
| `add_particles` | Add a particle layer by preset (auto-resolves layer type from preset category). 15 presets. |
| `list_particle_presets` | List all presets, optionally filtered by category (falling/floating/scatter/mist) |
| `set_particle_depth` | Configure depth: horizonY, depthEasing, depthDistribution, depthBandMin/Max |
| `set_particle_motion` | Configure motion: windAngle, windStrength, fallProgress, driftRange, driftPhase, driftX |
| `set_particle_style` | Configure style: color, colorVariation, opacity, glow, glowColor, sizeMin, sizeMax |
| `create_atmosphere` | Compose a multi-layer atmospheric scene from 6 built-in recipes |
| `randomize_particles` | Generate a random particle layer, optionally constrained by category |
| `set_mist_band` | Configure mist: bandTop, bandBottom, edgeSoftness, density, noiseScale, layerCount |

## Atmosphere Recipes (6)

The `create_atmosphere` tool composes multi-layer scenes from curated preset combinations:

| Recipe | Layers | Description |
|---|---|---|
| `winter-storm` | snow + fog-wisps + mountain-haze | Heavy snowfall with obscuring mist and distant haze |
| `autumn-forest` | autumn-leaves + fallen-leaves + morning-mist | Falling and fallen leaves in a misty forest |
| `misty-morning` | morning-mist + dust-motes | Soft low mist with sunlit dust particles |
| `firefly-night` | fireflies + fog-wisps | Glowing fireflies drifting through night fog |
| `spring-meadow` | petals + pollen + wildflowers | Drifting petals and pollen above a wildflower meadow |
| `dusty-ruins` | dust-motes + pebbles + ground-steam | Dust and steam rising among scattered rubble |

## Rendering

Each layer type renders via canvas2d:

- **Falling** — Seed-deterministic positions with depth-scaled size and opacity; 7 shape renderers (snowflake, raindrop, leaf, petal, ash, dust, circle)
- **Floating** — Noise-based jitter with sinusoidal drift frozen at `driftPhase`; firefly uses radial gradient glow
- **Scatter** — Elements scattered between `groundY` and canvas bottom with perspective depth scaling size and opacity
- **Mist** — Fractal noise sampled into a 1/4-resolution buffer, then scaled up for soft fog bands with configurable edge softness

## Utilities

Shared utilities exported for advanced use:

```typescript
import {
  mulberry32,                          // Deterministic PRNG
  createValueNoise, createFractalNoise, // Procedural noise generators
  parseHex, toHex, lerpColor, varyColor, // Color interpolation and variation
  applyDepthEasing,                    // Depth curve functions
} from "@genart-dev/plugin-particles";
```

## Preset Discovery

```typescript
import { ALL_PRESETS, filterPresets, searchPresets, getPreset } from "@genart-dev/plugin-particles";

// All 15 presets
console.log(ALL_PRESETS.length); // 15

// Filter by category
const falling = filterPresets({ category: "falling" });   // 4 presets
const mist = filterPresets({ category: "mist" });         // 4 presets

// Full-text search
const results = searchPresets("fire"); // fireflies

// Look up by ID
const preset = getPreset("snow");
```

## Related Packages

| Package | Purpose |
|---|---|
| [`@genart-dev/core`](https://github.com/genart-dev/core) | Plugin host, layer system (dependency) |
| [`@genart-dev/mcp-server`](https://github.com/genart-dev/mcp-server) | MCP server that surfaces plugin tools to AI agents |
| [`@genart-dev/plugin-terrain`](https://github.com/genart-dev/plugin-terrain) | Sky, terrain profiles, clouds, water surfaces (21 presets) |
| [`@genart-dev/plugin-painting`](https://github.com/genart-dev/plugin-painting) | Vector-field-driven painting layers |
| [`@genart-dev/plugin-perspective`](https://github.com/genart-dev/plugin-perspective) | Perspective grids and depth guides |
| [`@genart-dev/plugin-plants`](https://github.com/genart-dev/plugin-plants) | Algorithmic plant generation (110 presets) |

## Support

Questions, bugs, or feedback — [support@genart.dev](mailto:support@genart.dev) or [open an issue](https://github.com/genart-dev/plugin-particles/issues).

## License

MIT
