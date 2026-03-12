/** Depth easing curve types. */
export type DepthEasing = "linear" | "quadratic" | "cubic" | "exponential";

/** How particles distribute across depth bands. */
export type DepthDistribution = "uniform" | "foreground-heavy" | "background-heavy" | "midground";

export interface DepthConfig {
  /** Normalized horizon Y (0=top, 1=bottom). */
  horizonY: number;
  easing: DepthEasing;
  distribution: DepthDistribution;
}

/** Map a linear t in [0,1] through the chosen easing curve. */
export function applyDepthEasing(t: number, easing: DepthEasing): number {
  switch (easing) {
    case "linear":
      return t;
    case "quadratic":
      return t * t;
    case "cubic":
      return t * t * t;
    case "exponential": {
      const k = 3;
      return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
    }
  }
}

/**
 * Compute depth (0=far/background, 1=near/foreground) from a normalized Y position.
 * Below horizon → depth scales from 0 at horizon to 1 at bottom.
 * Above horizon → always 0 (far).
 */
export function computeDepth(normalizedY: number, config: DepthConfig): number {
  if (normalizedY <= config.horizonY) return 0;
  const t = (normalizedY - config.horizonY) / (1 - config.horizonY);
  return applyDepthEasing(Math.min(1, Math.max(0, t)), config.easing);
}

/**
 * Apply depth-based scaling to particle size and opacity.
 * depth 0 = far (smaller, more transparent), depth 1 = near (full size, full opacity).
 */
export function applyDepthToParticle(
  depth: number,
  sizeMin: number,
  sizeMax: number,
  baseOpacity: number,
): { size: number; opacity: number } {
  return {
    size: sizeMin + (sizeMax - sizeMin) * depth,
    opacity: baseOpacity * (0.3 + 0.7 * depth),
  };
}

/**
 * Sample a depth value for a particle based on distribution preference.
 * Returns a depth in [0, 1] biased by the distribution type.
 */
export function sampleDepthDistribution(
  rng: () => number,
  distribution: DepthDistribution,
): number {
  const r = rng();
  switch (distribution) {
    case "uniform":
      return r;
    case "foreground-heavy":
      return Math.sqrt(r); // bias toward 1
    case "background-heavy":
      return 1 - Math.sqrt(1 - r); // bias toward 0
    case "midground":
      // Beta-like distribution peaking at 0.5
      return (r + rng()) * 0.5;
  }
}
