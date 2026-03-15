import type { ParticlePreset, PresetCategory } from "./types.js";
import { FALLING_PRESETS } from "./falling.js";
import { FLOATING_PRESETS } from "./floating.js";
import { SCATTER_PRESETS } from "./scatter.js";
import { MIST_PRESETS } from "./mist.js";
import { TRAILING_PRESETS } from "./trailing.js";

export const ALL_PRESETS: ParticlePreset[] = [
  ...FALLING_PRESETS,
  ...FLOATING_PRESETS,
  ...SCATTER_PRESETS,
  ...MIST_PRESETS,
  ...TRAILING_PRESETS,
];

/** Look up a preset by ID. */
export function getPreset(id: string): ParticlePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

/** Filter presets by category and/or tags. */
export function filterPresets(opts: {
  category?: PresetCategory;
  tags?: string[];
}): ParticlePreset[] {
  let results = ALL_PRESETS;

  if (opts.category) {
    results = results.filter((p) => p.category === opts.category);
  }

  if (opts.tags && opts.tags.length > 0) {
    const searchTags = opts.tags.map((t) => t.toLowerCase());
    results = results.filter((p) =>
      searchTags.some((t) => p.tags.includes(t)),
    );
  }

  return results;
}

/** Full-text search across preset names, descriptions, and tags. */
export function searchPresets(query: string): ParticlePreset[] {
  const q = query.toLowerCase();
  return ALL_PRESETS.filter(
    (p) =>
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)),
  );
}

/** Map preset category to layer type ID. */
export function categoryToLayerType(category: PresetCategory): string {
  return `particles:${category}`;
}
