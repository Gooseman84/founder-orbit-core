/**
 * Generic scoring utilities for TrueBlazer.
 *
 * Centralizes all scoring math so we can tweak weights and thresholds
 * in one place and keep behavior consistent across the app.
 */

export interface WeightedScoreInput {
  value: number;
  weight: number;
}

/**
 * Clamp a score to the 0–100 range.
 */
export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

/**
 * Normalize a raw score within [min, max] into a 0–100 scale.
 *
 * If min === max, returns 0 to avoid division by zero.
 */
export function normalizeScore(
  raw: number,
  min: number,
  max: number
): number {
  if (Number.isNaN(raw) || Number.isNaN(min) || Number.isNaN(max)) {
    return 0;
  }
  if (max <= min) return 0;
  const normalized = ((raw - min) / (max - min)) * 100;
  return clampScore(normalized);
}

/**
 * Compute a weighted average from an array of { value, weight } pairs.
 * Values are assumed to already be in 0–100 range.
 */
export function weightedAverage(inputs: WeightedScoreInput[]): number {
  const valid = inputs.filter(
    (i) =>
      typeof i.value === "number" &&
      typeof i.weight === "number" &&
      i.weight > 0
  );

  if (valid.length === 0) return 0;

  const totalWeight = valid.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = valid.reduce(
    (sum, i) => sum + i.value * (i.weight / totalWeight),
    0
  );

  return clampScore(weightedSum);
}

/**
 * Categorize a 0–100 score into a simple band.
 */
export function categorizeScore(
  score: number
): "low" | "medium" | "high" {
  const s = clampScore(score);

  if (s < 40) return "low";
  if (s < 70) return "medium";
  return "high";
}

/**
 * Helper to safely convert optional numeric-like inputs to 0–100.
 */
export function toScore(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || Number.isNaN(value)) return fallback;
  return clampScore(value);
}
