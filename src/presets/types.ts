import type { DepthEasing, DepthDistribution } from "../shared/depth.js";

/** Base preset fields shared by all particle presets. */
interface BasePreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

/** Falling particles preset (snow, rain, leaves, etc). */
export interface FallingPreset extends BasePreset {
  category: "falling";
  particleType: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorVariation: number;
  opacity: number;
  windAngle: number;
  windStrength: number;
  fallProgress: number;
  depthDistribution: DepthDistribution;
  depthEasing: DepthEasing;
  horizonY: number;
}

/** Floating particles preset (dust motes, fireflies, etc). */
export interface FloatingPreset extends BasePreset {
  category: "floating";
  particleType: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  opacity: number;
  glow: boolean;
  glowColor: string;
  driftRange: number;
  driftPhase: number;
  depthBandMin: number;
  depthBandMax: number;
  depthEasing: DepthEasing;
  horizonY: number;
}

/** Scatter elements preset (fallen leaves, pebbles, etc). */
export interface ScatterPreset extends BasePreset {
  category: "scatter";
  elementType: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorVariation: number;
  rotationRange: number;
  distribution: "uniform" | "clustered" | "edge-weighted" | "center-weighted";
  clusterStrength: number;
  groundY: number;
  horizonY: number;
  depthEasing: DepthEasing;
}

/** Mist/fog preset. */
export interface MistPreset extends BasePreset {
  category: "mist";
  density: number;
  color: string;
  opacity: number;
  bandTop: number;
  bandBottom: number;
  edgeSoftness: number;
  noiseScale: number;
  noiseOctaves: number;
  driftX: number;
  driftPhase: number;
  layerCount: number;
  depthSpread: number;
}

/** Trailing streak/comet particle preset (meteors, speed rain, light trails). */
export interface TrailingPreset extends BasePreset {
  category: "trailing";
  count: number;
  sizeMin: number;
  sizeMax: number;
  trailLength: number;
  motionAngle: number;
  motionVariation: number;
  color: string;
  colorVariation: number;
  opacity: number;
  glow: boolean;
  glowColor: string;
  depthDistribution: DepthDistribution;
  depthEasing: DepthEasing;
  horizonY: number;
}

/** Discriminated union of all particle presets. */
export type ParticlePreset = FallingPreset | FloatingPreset | ScatterPreset | MistPreset | TrailingPreset;

export type PresetCategory = "falling" | "floating" | "scatter" | "mist" | "trailing";
