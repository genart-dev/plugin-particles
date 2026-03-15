import { describe, it, expect } from "vitest";
import { ALL_PRESETS, getPreset, filterPresets, searchPresets } from "../src/presets/index.js";

describe("presets", () => {
  it("has 34 total presets", () => {
    expect(ALL_PRESETS.length).toBe(34);
  });

  it("has 9 falling presets", () => {
    expect(filterPresets({ category: "falling" })).toHaveLength(9);
  });

  it("has 8 floating presets", () => {
    expect(filterPresets({ category: "floating" })).toHaveLength(8);
  });

  it("has 6 scatter presets", () => {
    expect(filterPresets({ category: "scatter" })).toHaveLength(6);
  });

  it("has 6 mist presets", () => {
    expect(filterPresets({ category: "mist" })).toHaveLength(6);
  });

  it("new falling presets exist", () => {
    for (const id of ["embers", "ash-fall", "cherry-blossoms", "confetti", "pine-needles"]) {
      expect(getPreset(id)).toBeDefined();
      expect(getPreset(id)!.category).toBe("falling");
    }
  });

  it("new floating presets exist", () => {
    for (const id of ["dandelion-seeds", "butterflies", "bubbles", "sparkles"]) {
      expect(getPreset(id)).toBeDefined();
      expect(getPreset(id)!.category).toBe("floating");
    }
  });

  it("new scatter presets exist", () => {
    for (const id of ["shells", "acorns", "sea-foam"]) {
      expect(getPreset(id)).toBeDefined();
      expect(getPreset(id)!.category).toBe("scatter");
    }
  });

  it("new mist presets exist", () => {
    for (const id of ["ground-steam-thick", "smoke-wisps"]) {
      expect(getPreset(id)).toBeDefined();
      expect(getPreset(id)!.category).toBe("mist");
    }
  });

  it("has 5 trailing presets", () => {
    expect(filterPresets({ category: "trailing" })).toHaveLength(5);
  });

  it("trailing presets exist", () => {
    for (const id of ["meteor-shower", "speed-rain", "shooting-stars", "light-trails", "rising-sparks"]) {
      expect(getPreset(id)).toBeDefined();
      expect(getPreset(id)!.category).toBe("trailing");
    }
  });

  it("all presets have unique IDs", () => {
    const ids = ALL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all presets have required fields", () => {
    for (const p of ALL_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.tags.length).toBeGreaterThan(0);
      expect(["falling", "floating", "scatter", "mist", "trailing"]).toContain(p.category);
    }
  });

  it("getPreset returns correct preset", () => {
    const snow = getPreset("snow");
    expect(snow).toBeDefined();
    expect(snow!.name).toBe("Snow");
    expect(snow!.category).toBe("falling");
  });

  it("getPreset returns undefined for unknown ID", () => {
    expect(getPreset("nonexistent")).toBeUndefined();
  });

  it("filterPresets by category", () => {
    const fallingPresets = filterPresets({ category: "falling" });
    expect(fallingPresets.every((p) => p.category === "falling")).toBe(true);
  });

  it("filterPresets by tags", () => {
    const winterPresets = filterPresets({ tags: ["winter"] });
    expect(winterPresets.length).toBeGreaterThan(0);
    expect(winterPresets.every((p) => p.tags.includes("winter"))).toBe(true);
  });

  it("searchPresets by name", () => {
    const results = searchPresets("fireflies");
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe("fireflies");
  });

  it("searchPresets by description keyword", () => {
    const results = searchPresets("snow");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searchPresets case-insensitive", () => {
    expect(searchPresets("SNOW")).toHaveLength(1);
  });
});
