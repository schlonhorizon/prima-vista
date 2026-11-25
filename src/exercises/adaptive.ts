import type { ItemStats, StatsStore } from '../stats/statsStore';
import type { WeightModifier } from './selection';

/**
 * Adaptive weighting (first building block of ROADMAP Teil 6): elements that are
 * often wrong, slow or not practised yet come up more often. The factor multiplies
 * the base weight of every candidate of an element.
 */
export interface AdaptiveOptions {
  /** Extra weight for an element answered wrong every time (factor 1 + errorWeight). */
  errorWeight: number;
  /** Extra weight for an element twice as slow as the median (and slower). */
  slowWeight: number;
  /** Factor for elements never practised. */
  unseenFactor: number;
  /** How many recent attempts count. */
  window: number;
  /** Weight of each older attempt relative to the next newer one (recovery speed). */
  decay: number;
  minFactor: number;
  maxFactor: number;
}

export type AdaptiveStrength = 1 | 2 | 3;

export const ADAPTIVE_STRENGTHS: Record<AdaptiveStrength, AdaptiveOptions> = {
  1: { errorWeight: 1.5, slowWeight: 0.5, unseenFactor: 1.5, window: 20, decay: 0.85, minFactor: 0.5, maxFactor: 3 },
  2: { errorWeight: 3, slowWeight: 1, unseenFactor: 2, window: 20, decay: 0.85, minFactor: 0.4, maxFactor: 5 },
  3: { errorWeight: 5, slowWeight: 1.5, unseenFactor: 2.5, window: 20, decay: 0.85, minFactor: 0.3, maxFactor: 8 },
};

/** Error value of one attempt: skipped counts ¾, a hit with a tip ½. */
function attemptError(a: ItemStats['recent'][number]): number {
  if (a.skipped) return 0.75;
  if (!a.ok) return 1;
  return a.help ? 0.5 : 0;
}

/** Recency-weighted error rate of the last attempts (0 = always right, 1 = always wrong). */
export function errorScore(item: Readonly<ItemStats>, o: AdaptiveOptions): number {
  const recent = item.recent.slice(-o.window);
  let sum = 0;
  let weights = 0;
  recent.forEach((a, i) => {
    const w = Math.pow(o.decay, recent.length - 1 - i);
    sum += w * attemptError(a);
    weights += w;
  });
  return weights > 0 ? sum / weights : 0;
}

export function averageHitTime(item: Readonly<ItemStats> | undefined): number | null {
  return item && item.hitTimeCount > 0 ? item.hitTimeSum / item.hitTimeCount : null;
}

export function adaptiveFactor(item: Readonly<ItemStats> | undefined, medianHitMs: number | null, o: AdaptiveOptions): number {
  if (!item || item.recent.length === 0) return o.unseenFactor;
  const avg = averageHitTime(item);
  const slow = avg !== null && medianHitMs ? Math.min(1, Math.max(0, avg / medianHitMs - 1)) : 0;
  const error = errorScore(item, o);
  // Elements answered quickly and reliably drop below 1 so the weak ones dominate.
  const raw = 1 + o.errorWeight * error + o.slowWeight * slow - (error === 0 && slow === 0 ? 0.5 : 0);
  return Math.min(o.maxFactor, Math.max(o.minFactor, raw));
}

export function medianHitTime(stats: StatsStore, keys: readonly string[]): number | null {
  const times = keys.map((k) => averageHitTime(stats.getItem(k))).filter((t): t is number => t !== null).sort((a, b) => a - b);
  if (times.length === 0) return null;
  const mid = Math.floor(times.length / 2);
  return times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
}

/** WeightModifier from the statistics; `options()` returning null switches it off. */
export function adaptiveModifier(
  stats: StatsStore,
  keys: () => readonly string[],
  options: () => AdaptiveOptions | null,
): WeightModifier {
  return (key) => {
    const o = options();
    if (!o) return 1;
    return adaptiveFactor(stats.getItem(key), medianHitTime(stats, keys()), o);
  };
}
