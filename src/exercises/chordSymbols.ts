import { chroma, type PitchClass } from '../core/pitch';
import type { ChordSymbolSettings } from '../settings';
import type { StatsStore } from '../stats/statsStore';
import type { StatsGroup } from '../stats/statsView';
import {
  ALL_ROOTS,
  bassPitchClass,
  CHORD_SYMBOL_LEVELS,
  CHORD_SYMBOL_TYPES,
  chordSymbolText,
  chordSymbolTones,
  CIRCLE_ROOTS,
  formulaText,
  noteName,
  referenceVoicing,
  WHITE_ROOTS,
  type ChordSymbolType,
} from '../theory/chordSymbols';
import { ADAPTIVE_STRENGTHS, adaptiveFactor, medianHitTime } from './adaptive';
import type { Candidate, ItemSelector } from './selection';
import type { Exercise, Task } from './types';

export const CHORD_SYMBOL_ID = 'chordsym';

/** Level n+1 unlocks once level n has at least this many answers … (corrected ones count as not clean) */
export const UNLOCK_MIN_ATTEMPTS = 20;
/** … with at least this hit rate (answers without help). */
export const UNLOCK_RATE = 0.8;

export function chordSymbolItemKey(type: ChordSymbolType): string {
  return `${CHORD_SYMBOL_ID}|${type.id}`;
}

/**
 * Clean hits and the other answers (misses, and hits only after corrections) of all
 * chord types of a level, without help.
 */
export function levelTotals(stats: StatsStore, level: number): { hits: number; misses: number } {
  let hits = 0;
  let misses = 0;
  for (const t of CHORD_SYMBOL_TYPES.filter((t) => t.level === level)) {
    const item = stats.getItem(chordSymbolItemKey(t));
    hits += item?.hits ?? 0;
    misses += (item?.misses ?? 0) + (item?.correctedHits ?? 0);
  }
  return { hits, misses };
}

/** Highest unlocked level: level n+1 needs ≥ 80 % over ≥ 20 answers in level n. */
export function unlockedLevel(stats: StatsStore): number {
  let level = 1;
  while (level < 5) {
    const { hits, misses } = levelTotals(stats, level);
    const total = hits + misses;
    if (total < UNLOCK_MIN_ATTEMPTS || hits / total < UNLOCK_RATE) break;
    level++;
  }
  return level;
}

/**
 * A chord symbol is shown, the player grips the chord. Recognised by pitch
 * classes: every inversion and octave counts; strict mode requires the root in
 * the bass. Weighted adaptively per chord type.
 */
export class ChordSymbolExercise implements Exercise {
  readonly id = CHORD_SYMBOL_ID;
  private circleIndex = -1;

  constructor(
    private getSettings: () => ChordSymbolSettings,
    private stats: StatsStore,
    private selector: ItemSelector,
    private chordWindowMs: () => number,
    private random: () => number = Math.random,
  ) {}

  /** The level actually practised (selected, but at most the unlocked one). */
  activeLevel(): number {
    const s = this.getSettings();
    return s.unlockAll ? s.level : Math.min(s.level, unlockedLevel(this.stats));
  }

  activeTypes(): ChordSymbolType[] {
    const level = this.activeLevel();
    return CHORD_SYMBOL_TYPES.filter((t) => t.level <= level);
  }

  /** Keys of all chord types (for the median reaction time of the adaptive factor). */
  allKeys(): string[] {
    return CHORD_SYMBOL_TYPES.map(chordSymbolItemKey);
  }

  private nextRoot(): PitchClass {
    const s = this.getSettings();
    if (s.roots === 'circle') {
      this.circleIndex = (this.circleIndex + 1) % CIRCLE_ROOTS.length;
      return CIRCLE_ROOTS[this.circleIndex];
    }
    const roots = s.roots === 'white' ? WHITE_ROOTS : ALL_ROOTS;
    return roots[Math.floor(this.random() * roots.length)] ?? roots[0];
  }

  nextTask(): Task {
    const s = this.getSettings();
    const level = this.activeLevel();
    const candidates: Candidate<ChordSymbolType>[] = this.activeTypes().map((t) => ({
      item: t,
      key: chordSymbolItemKey(t),
      // New material of the highest level comes up a bit more often.
      baseWeight: t.level === level ? 1.5 : 1,
    }));
    const type = this.selector.pick(candidates);
    const root = this.nextRoot();
    const tones = chordSymbolTones(root, type);
    const bass = bassPitchClass(root, type) ?? (s.strict ? root : null);
    const voicing = referenceVoicing(root, type);
    const symbol = chordSymbolText(root, type, s.notation);
    return {
      exerciseId: this.id,
      layout: 'treble',
      key: null,
      steps: [{ pitches: voicing }],
      answer: 'play',
      itemKey: chordSymbolItemKey(type),
      label: symbol,
      detail: `${tones.map((t) => noteName(t.pc, s.notation)).join(' – ')} · ${formulaText(type)}`,
      chordWindowMs: this.chordWindowMs(),
      pitchClassAnswer: {
        required: [...new Set(tones.filter((t) => !t.optional).map((t) => chroma(t.pc)))],
        optional: tones.filter((t) => t.optional).map((t) => chroma(t.pc)),
        bass: bass ? chroma(bass) : null,
      },
      info: { kind: 'chordsym', root, type, notation: s.notation, strict: s.strict },
    };
  }

  statsGroups(): StatsGroup[] {
    const s = this.getSettings();
    const unlocked = s.unlockAll ? 5 : unlockedLevel(this.stats);
    const options = ADAPTIVE_STRENGTHS[s.adaptiveStrength];
    const median = medianHitTime(this.stats, this.allKeys());
    return [1, 2, 3, 4, 5].map((level) => ({
      title: `Level ${level}: ${CHORD_SYMBOL_LEVELS[level]}${level > unlocked ? ' (gesperrt)' : ''}`,
      columns: ['Akkordtyp', 'Beispiel', 'Formel', 'Gewicht'],
      rows: CHORD_SYMBOL_TYPES.filter((t) => t.level === level).map((t) => ({
        cells: [
          t.name,
          chordSymbolText({ step: 'C', alter: 0 }, t, s.notation),
          formulaText(t),
          s.adaptive && level <= unlocked
            ? `×${adaptiveFactor(this.stats.getItem(chordSymbolItemKey(t)), median, options).toFixed(1).replace('.', ',')}`
            : '–',
        ],
        keys: [chordSymbolItemKey(t)],
      })),
    }));
  }
}

