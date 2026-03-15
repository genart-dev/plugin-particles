import { describe, it, expect, vi } from "vitest";
import { particlesMcpTools } from "../src/particles-tools.js";
import type { McpToolContext, DesignLayer, LayerProperties } from "@genart-dev/core";

function createMockContext(): McpToolContext {
  const layers = new Map<string, DesignLayer>();
  return {
    canvasWidth: 800,
    canvasHeight: 600,
    layers: {
      add: vi.fn((layer: DesignLayer) => layers.set(layer.id, layer)),
      get: vi.fn((id: string) => layers.get(id)),
      updateProperties: vi.fn((id: string, props: Partial<LayerProperties>) => {
        const layer = layers.get(id);
        if (layer) {
          layer.properties = { ...layer.properties, ...props } as Record<string, string | number | boolean | null>;
        }
      }),
      list: vi.fn(() => [...layers.values()]),
    },
    emitChange: vi.fn(),
  } as unknown as McpToolContext;
}

function getTool(name: string) {
  const tool = particlesMcpTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

describe("particles MCP tools", () => {
  it("exports 9 tools", () => {
    expect(particlesMcpTools).toHaveLength(9);
  });

  it("all tools have name, description, and handler", () => {
    for (const tool of particlesMcpTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.handler).toBeInstanceOf(Function);
    }
  });

  describe("add_particles", () => {
    it("adds a falling layer with snow preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({ preset: "snow" }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
      expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.type).toBe("particles:falling");
    });

    it("adds a floating layer with fireflies preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({ preset: "fireflies" }, ctx);
      expect(result.isError).toBeUndefined();
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.type).toBe("particles:floating");
    });

    it("adds a scatter layer with pebbles preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({ preset: "pebbles" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.type).toBe("particles:scatter");
    });

    it("adds a mist layer with morning-mist preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({ preset: "morning-mist" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.type).toBe("particles:mist");
    });

    it("returns error for unknown preset", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({ preset: "tornado" }, ctx);
      expect(result.isError).toBe(true);
    });

    it("accepts color and count overrides", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({
        preset: "snow",
        color: "#FF0000",
        count: 500,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.properties.color).toBe("#FF0000");
      expect(layer.properties.count).toBe(500);
    });

    it("accepts depthLane and atmosphericMode overrides", async () => {
      const ctx = createMockContext();
      const result = await getTool("add_particles").handler({
        preset: "snow",
        depthLane: "background-1",
        atmosphericMode: "western",
      }, ctx);
      expect(result.isError).toBeUndefined();
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.properties.depthLane).toBe("background-1");
      expect(layer.properties.atmosphericMode).toBe("western");
    });

    it("adds new falling presets (embers, confetti)", async () => {
      for (const preset of ["embers", "confetti", "cherry-blossoms", "ash-fall", "pine-needles"]) {
        const ctx = createMockContext();
        const result = await getTool("add_particles").handler({ preset }, ctx);
        expect(result.isError).toBeUndefined();
        const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
        expect(layer.type).toBe("particles:falling");
      }
    });

    it("adds new floating presets (butterflies, bubbles)", async () => {
      for (const preset of ["dandelion-seeds", "butterflies", "bubbles", "sparkles"]) {
        const ctx = createMockContext();
        const result = await getTool("add_particles").handler({ preset }, ctx);
        expect(result.isError).toBeUndefined();
        const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
        expect(layer.type).toBe("particles:floating");
      }
    });

    it("adds new scatter presets (shells, acorns, sea-foam)", async () => {
      for (const preset of ["shells", "acorns", "sea-foam"]) {
        const ctx = createMockContext();
        const result = await getTool("add_particles").handler({ preset }, ctx);
        expect(result.isError).toBeUndefined();
        const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
        expect(layer.type).toBe("particles:scatter");
      }
    });

    it("adds new mist presets (ground-steam-thick, smoke-wisps)", async () => {
      for (const preset of ["ground-steam-thick", "smoke-wisps"]) {
        const ctx = createMockContext();
        const result = await getTool("add_particles").handler({ preset }, ctx);
        expect(result.isError).toBeUndefined();
        const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
        expect(layer.type).toBe("particles:mist");
      }
    });
  });

  describe("list_particle_presets", () => {
    it("lists all presets when no filter", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_particle_presets").handler({}, ctx);
      expect(result.content[0]!.text).toContain("34 presets");
    });

    it("filters by category", async () => {
      const ctx = createMockContext();
      const result = await getTool("list_particle_presets").handler({ category: "falling" }, ctx);
      expect(result.content[0]!.text).toContain("9 presets");
    });
  });

  describe("set_particle_depth", () => {
    it("updates depth properties", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_particle_depth").handler({
        layerId: layer.id,
        horizonY: 0.5,
        depthEasing: "cubic",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.updateProperties).toHaveBeenCalled();
    });

    it("returns error for non-particle layer", async () => {
      const ctx = createMockContext();
      // Manually add a non-particle layer
      const fakeLayer: DesignLayer = {
        id: "fake-123",
        type: "terrain:sky",
        name: "Sky",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0 },
        properties: {},
      };
      (ctx.layers.add as any)(fakeLayer);

      const result = await getTool("set_particle_depth").handler({
        layerId: "fake-123",
        horizonY: 0.5,
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("returns error when no changes specified", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_particle_depth").handler({
        layerId: layer.id,
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("set_particle_motion", () => {
    it("updates motion properties", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_particle_motion").handler({
        layerId: layer.id,
        windAngle: 30,
        windStrength: 0.8,
      }, ctx);
      expect(result.isError).toBeUndefined();
    });
  });

  describe("set_particle_style", () => {
    it("updates style properties", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_particle_style").handler({
        layerId: layer.id,
        color: "#0000FF",
        opacity: 0.5,
        sizeMax: 20,
      }, ctx);
      expect(result.isError).toBeUndefined();
    });
  });

  describe("set_depth_lane", () => {
    it("updates depthLane on a particle layer", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: layer.id,
        depthLane: "background-2",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.updateProperties).toHaveBeenCalled();
    });

    it("updates atmosphericMode on a particle layer", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "fireflies" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: layer.id,
        atmosphericMode: "ink-wash",
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("updates both depthLane and atmosphericMode", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "fallen-leaves" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: layer.id,
        depthLane: "foreground-3",
        atmosphericMode: "western",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain("depthLane");
      expect(result.content[0]!.text).toContain("atmosphericMode");
    });

    it("returns error for non-particle layer", async () => {
      const ctx = createMockContext();
      const fakeLayer: DesignLayer = {
        id: "fake-456",
        type: "terrain:sky",
        name: "Sky",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: { x: 0, y: 0, width: 800, height: 600, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0 },
        properties: {},
      };
      (ctx.layers.add as any)(fakeLayer);

      const result = await getTool("set_depth_lane").handler({
        layerId: "fake-456",
        depthLane: "midground",
      }, ctx);
      expect(result.isError).toBe(true);
    });

    it("returns error when no changes specified", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_depth_lane").handler({
        layerId: layer.id,
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("create_atmosphere", () => {
    it("creates winter-storm with 3 layers", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_atmosphere").handler({
        recipe: "winter-storm",
      }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalledTimes(3);
      expect(result.content[0]!.text).toContain("3 layers");
    });

    it("creates misty-morning with 2 layers", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_atmosphere").handler({
        recipe: "misty-morning",
      }, ctx);
      expect(ctx.layers.add).toHaveBeenCalledTimes(2);
    });

    it("returns error for unknown recipe", async () => {
      const ctx = createMockContext();
      const result = await getTool("create_atmosphere").handler({
        recipe: "unknown-recipe",
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("randomize_particles", () => {
    it("adds a random particle layer", async () => {
      const ctx = createMockContext();
      const result = await getTool("randomize_particles").handler({ seed: 42 }, ctx);
      expect(result.isError).toBeUndefined();
      expect(ctx.layers.add).toHaveBeenCalled();
    });

    it("constrains to category", async () => {
      const ctx = createMockContext();
      const result = await getTool("randomize_particles").handler({
        category: "mist",
        seed: 42,
      }, ctx);
      expect(result.isError).toBeUndefined();
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;
      expect(layer.type).toBe("particles:mist");
    });
  });

  describe("set_mist_band", () => {
    it("updates mist band properties", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "morning-mist" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_mist_band").handler({
        layerId: layer.id,
        bandTop: 0.3,
        bandBottom: 0.9,
        density: 0.7,
      }, ctx);
      expect(result.isError).toBeUndefined();
    });

    it("returns error for non-mist layer", async () => {
      const ctx = createMockContext();
      await getTool("add_particles").handler({ preset: "snow" }, ctx);
      const layer = (ctx.layers.add as any).mock.calls[0][0] as DesignLayer;

      const result = await getTool("set_mist_band").handler({
        layerId: layer.id,
        density: 0.5,
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });
});
