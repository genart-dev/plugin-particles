import { describe, it, expect } from "vitest";
import { ALL_PRESETS, getPreset, filterPresets, searchPresets } from "../src/presets/index.js";

describe("presets", () => {
  it("has 15 total presets", () => {
    expect(ALL_PRESETS.length).toBe(15);
  });

  it("has 4 falling presets", () => {
    expect(filterPresets({ category: "falling" })).toHaveLength(4);
  });

  it("has 4 floating presets", () => {
    expect(filterPresets({ category: "floating" })).toHaveLength(4);
  });

  it("has 3 scatter presets", () => {
    expect(filterPresets({ category: "scatter" })).toHaveLength(3);
  });

  it("has 4 mist presets", () => {
    expect(filterPresets({ category: "mist" })).toHaveLength(4);
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
      expect(["falling", "floating", "scatter", "mist"]).toContain(p.category);
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
